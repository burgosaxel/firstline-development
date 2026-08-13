const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

initializeApp();

const db = getFirestore();
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');

const NOTIFICATION_EMAIL = 'firstlinedevnt@gmail.com';
const SOURCE = 'firstline-development-site';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ALLOWED_ORIGINS = new Set([
  'https://burgosaxel.github.io',
  'https://firstlinedev.com',
  'https://www.firstlinedev.com'
]);
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const FIELD_LIMITS = {
  name: 120,
  businessName: 160,
  email: 254,
  phone: 60,
  currentWebsite: 300,
  projectType: 120,
  businessNeed: 500,
  message: 3000
};

const REQUIRED_FIELDS = [
  'name',
  'businessName',
  'email',
  'phone',
  'projectType',
  'businessNeed',
  'message'
];

const PROJECT_TYPES = new Set([
  'I need a new website',
  'I want to redesign my current website',
  'I need changes to an existing website',
  "I'm not sure yet"
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_PATTERN.test(origin);
};

const setCorsHeaders = (req, res) => {
  const origin = req.get('origin');

  if (origin && isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
};

const sendJson = (res, status, body) => {
  res.status(status).json(body);
};

const normalizeBody = (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return JSON.parse(req.rawBody.toString('utf8'));
  }

  return {};
};

const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

const validateSubmission = (body) => {
  const data = {};

  Object.keys(FIELD_LIMITS).forEach((field) => {
    data[field] = trimString(body[field]);
  });

  const errors = [];

  REQUIRED_FIELDS.forEach((field) => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  Object.entries(FIELD_LIMITS).forEach(([field, maxLength]) => {
    if (data[field].length > maxLength) {
      errors.push(`${field} is too long`);
    }
  });

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('email is invalid');
  }

  if (data.currentWebsite) {
    try {
      const url = new URL(data.currentWebsite);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('currentWebsite must be a valid URL');
      }
    } catch (_error) {
      errors.push('currentWebsite must be a valid URL');
    }
  }

  if (data.projectType && !PROJECT_TYPES.has(data.projectType)) {
    errors.push('projectType is invalid');
  }

  return { data, errors };
};

const getClientIp = (req) => {
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const getIpHash = (ip) => {
  const salt = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'firstline-development';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
};

const enforceRateLimit = async (req) => {
  const ipHash = getIpHash(getClientIp(req));
  const now = Date.now();
  const hourStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const rateRef = db.collection('contactRateLimits').doc(`${hourStart}_${ipHash}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const currentCount = snapshot.exists ? snapshot.get('count') || 0 : 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return false;
    }

    transaction.set(
      rateRef,
      {
        count: currentCount + 1,
        ipHash,
        hourStart: Timestamp.fromMillis(hourStart),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return true;
  });
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEmailHtml = (data, docId) => {
  const rows = [
    ['Name', data.name],
    ['Business Name', data.businessName],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Current Website', data.currentWebsite || 'Not provided'],
    ['Project Type', data.projectType],
    ['Business Need', data.businessNeed],
    ['Message', data.message]
  ];

  const rowMarkup = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="text-align:left;vertical-align:top;padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</th>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#05090c;">
      <h2 style="margin:0 0 12px;">New FirstLine Development inquiry</h2>
      <p style="margin:0 0 16px;color:#586575;">Firestore document: ${escapeHtml(docId)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">${rowMarkup}</table>
    </div>
  `;
};

const sendNotification = async (data, docId) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: NOTIFICATION_EMAIL,
      pass: gmailAppPassword.value()
    }
  });

  await transporter.sendMail({
    from: `"FirstLine Development" <${NOTIFICATION_EMAIL}>`,
    to: NOTIFICATION_EMAIL,
    replyTo: data.email,
    subject: `New website inquiry from ${data.name}`,
    text: [
      'New FirstLine Development inquiry',
      `Document: ${docId}`,
      `Name: ${data.name}`,
      `Business Name: ${data.businessName}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Current Website: ${data.currentWebsite || 'Not provided'}`,
      `Project Type: ${data.projectType}`,
      `Business Need: ${data.businessNeed}`,
      `Message: ${data.message}`
    ].join('\n'),
    html: buildEmailHtml(data, docId)
  });
};

exports.submitContactForm = onRequest(
  {
    region: 'us-east1',
    secrets: [gmailAppPassword],
    cors: false,
    maxInstances: 10
  },
  async (req, res) => {
    setCorsHeaders(req, res);

    const origin = req.get('origin');
    if (!isAllowedOrigin(origin)) {
      return sendJson(res, 403, { ok: false, error: 'Origin is not allowed.' });
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      res.set('Allow', 'POST, OPTIONS');
      return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    let body;
    try {
      body = normalizeBody(req);
    } catch (_error) {
      return sendJson(res, 400, { ok: false, error: 'Malformed JSON.' });
    }

    if (trimString(body.website)) {
      return sendJson(res, 200, { ok: true });
    }

    const { data, errors } = validateSubmission(body);
    if (errors.length > 0) {
      return sendJson(res, 400, { ok: false, error: 'Please check the form and try again.', details: errors });
    }

    const isWithinLimit = await enforceRateLimit(req);
    if (!isWithinLimit) {
      return sendJson(res, 429, { ok: false, error: 'Too many submissions. Please try again later.' });
    }

    const docRef = await db.collection('contactSubmissions').add({
      ...data,
      status: 'new',
      source: SOURCE,
      notificationStatus: 'pending',
      createdAt: FieldValue.serverTimestamp()
    });

    try {
      await sendNotification(data, docRef.id);
      await docRef.update({
        notificationStatus: 'sent',
        notificationSentAt: FieldValue.serverTimestamp()
      });
      console.info('Contact notification sent', { docId: docRef.id });
    } catch (error) {
      const notificationError = error.code || error.name || 'notification_error';
      await docRef.update({
        notificationStatus: 'failed',
        notificationError,
        notificationFailedAt: FieldValue.serverTimestamp()
      });
      console.warn('Contact notification failed', { docId: docRef.id, error: notificationError });
    }

    return sendJson(res, 200, { ok: true });
  }
);
