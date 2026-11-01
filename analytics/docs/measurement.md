# Measurement and event convention

Event envelope: `{event_name, occurred_at, page_path, client_id, schema_version, context}`. Never send visitor names, email, phone, order identifiers, free-form search text, or sensitive URLs. Server/client config validates event names and context allowlists.

TLU proposal events: `menu_view`, `menu_item_click`, `click_to_call`, `get_directions`, `order_click` only if an actual ordering element exists, and `social_click`. Optional `location_selected` is evidence-backed only if location selection remains an intentional interaction. SPA page views require exactly one route-change strategy.

Semantics: visitor is not an account; a click-to-call is not a completed call; directions click is not a visit; order click is not an order; Search Console query is a Google query; heatmap is interaction data, not eye tracking.
