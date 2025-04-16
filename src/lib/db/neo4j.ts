import neo4j, { Driver } from 'neo4j-driver';
import { logger } from '../logger';

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'neo4jtesting';
const env = process.env.NODE_ENV || 'development';

let driver: Driver;

function getEncryptionSetting() {
  // Only enable encryption in production environments
  return env === 'production' ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF';
}

async function waitForConnection(driver: Driver, retries = 10, delay = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    const session = driver.session();
    try {
      logger.info(`Attempt ${i + 1} of ${retries} to connect to Neo4j...`);
      await session.run('RETURN 1');
      logger.info('Successfully connected to Neo4j.');
      await session.close();
      return;
    } catch (err) {
      logger.warn(`Attempt ${i + 1} failed to connect to Neo4j. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      await session.close();
      if (i < retries - 1) {
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        logger.error(`Failed to connect to Neo4j after ${retries} attempts.`);
        throw new Error(`Failed to connect to Neo4j after ${retries} attempts: ${err}`);
      }
    }
  }
}

export function getDriver(): Driver {
  if (!driver) {
    logger.info(`Connecting to Neo4j at ${uri} with user ${user}`);
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      encrypted: getEncryptionSetting(),
    });
  }
  return driver;
}

export async function initDriver(): Promise<void> {
  logger.info('Initializing Neo4j connection...');
  const driver = getDriver();
  try {
    logger.info('Initializing Neo4j connection...');
    await waitForConnection(driver);
    logger.info('Neo4j driver successfully initialized.');
  } catch (err) {
    logger.error(`Failed to initialize Neo4j driver: ${err instanceof Error ? err.message : 'Unknown error'}`);
    throw err; // Re-throw the error to be handled by the caller
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) await driver.close();
}
