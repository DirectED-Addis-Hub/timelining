import neo4j, { Driver } from 'neo4j-driver';
import { logger } from '../logger';

// Environment variables
const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'neo4jtesting';

// Use the type inferred from neo4j.driver() for best compatibility
let _driver: Driver | null;

export function getDriver() {
  if (!_driver) {
    logger.info(`Connecting to Neo4j at ${uri} with user ${user}`);
    _driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return _driver;
}

export async function initDriver() {
  logger.info('Initializing Neo4j connection...');
  const driver = getDriver();

  try {
    logger.info('Verifying connection to Neo4j...');
    const serverInfo = await driver.verifyConnectivity(); 
    logger.info('Server Info:', serverInfo);
    return driver;
  } catch (err) {
    logger.error(`Failed to initialize Neo4j driver: ${err instanceof Error ? err.message : 'Unknown error'}`);
    await driver.close();  
    throw err;
  }
}

export async function closeDriver() {
  if (_driver) {
    logger.info('Closing Neo4j driver...');
    await _driver.close(); 
    _driver = null;
  }
}
