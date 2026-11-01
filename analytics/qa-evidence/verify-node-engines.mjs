import { readFile, writeFile } from 'node:fs/promises';
import semver from 'semver';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const rootNodeRange = manifest.engines?.node;
const declaredFloor = rootNodeRange && semver.minVersion(rootNodeRange)?.version;
if (!rootNodeRange || !declaredFloor) throw new Error('package.json engines.node must declare a satisfiable Node range');

const actualNode = process.versions.node;
const constraints = Object.entries(lock.packages)
  .filter(([, value]) => value?.engines?.node)
  .map(([path, value]) => ({ path, node: value.engines.node }));
const failuresFor = (target) => constraints.filter(({ node }) => !semver.satisfies(target, node, { includePrerelease: true }));
const declaredFloorFailures = failuresFor(declaredFloor);
const actualRuntimeFailures = failuresFor(actualNode);
const rootContractSatisfied = semver.satisfies(actualNode, rootNodeRange, { includePrerelease: true });
const result = {
  rootNodeRange,
  declaredFloor,
  actualNode,
  constraintsChecked: constraints.length,
  declaredFloorFailures,
  actualRuntimeFailures,
  rootContractSatisfied,
  success: declaredFloorFailures.length === 0 && actualRuntimeFailures.length === 0 && rootContractSatisfied
};
await writeFile('qa-evidence/node-engine-compatibility.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
if (!result.success) process.exitCode = 1;
