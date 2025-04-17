import neo4j, { Driver } from 'neo4j-driver';
import { logger } from '../logger';

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'neo4jtesting';

let _driver: Driver;

export function getDriver(): Driver {
  if (!_driver) {
    logger.info(`Connecting to Neo4j at ${uri} with user ${user}`);
    _driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return _driver;
}
// Modified to return the driver after successfully initializing
export async function initDriver(): Promise<Driver> {
  logger.info('Initializing Neo4j connection...');
  const driver = getDriver();
  try {
    logger.info('Verifying connection to Neo4j...');
    // Verify the server connection by getting server info
    const serverInfo = await driver.getServerInfo();
    logger.info('Server Info:', serverInfo);
    return driver;
  } catch (err) {
    logger.error(`Failed to initialize Neo4j driver: ${err instanceof Error ? err.message : 'Unknown error'}`);
    await driver.close();  // Close the driver in case of an error
    throw err;  // Re-throw the error to be handled by the caller
  }
}

// Modified to only close the driver if it was initialized
export async function closeDriver(): Promise<void> {
  if (_driver) {
    logger.info('Closing Neo4j driver...');
    await _driver.close();
  }
}
