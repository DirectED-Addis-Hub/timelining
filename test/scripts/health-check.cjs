const { execSync } = require('child_process');

const container = 'neo4j-test';
let healthy = false;
const timeout = Date.now() + 60_000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  while (!healthy && Date.now() < timeout) {
    const status = execSync(`docker inspect -f "{{.State.Health.Status}}" ${container}`).toString().trim();
    if (status === 'healthy') {
      healthy = true;
      break;
    }
    console.log('Waiting for Neo4j to be healthy...');
    await sleep(2000); // 2 seconds
  }

  if (!healthy) {
    console.error('Neo4j did not become healthy in time.');
    process.exit(1);
  }
})();
