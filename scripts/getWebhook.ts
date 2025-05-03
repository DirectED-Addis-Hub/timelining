import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import inquirer from "inquirer";

async function promptForToken(token?: string) {
  if (token) return token;

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "token",
      message: "Enter your Telegram bot token:",
      validate: (val) => val.startsWith("bot") || val.length > 30 || "Invalid token",
    },
  ]);

  return answers.token;
}

async function getWebhookStatus(token: string) {
  const endpoint = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const response = await axios.get(endpoint);
  return response.data.result;
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option("token", {
      type: "string",
      description: "Telegram bot token",
    })
    .help()
    .parseSync();

  const token = await promptForToken(argv.token);

  try {
    const status = await getWebhookStatus(token);

    console.log("\n📦 Webhook Status:");
    console.log("----------------------");
    console.log(`URL:         ${status.url || "❌ Not set"}`);
    console.log(`Has Custom Certificate: ${status.has_custom_certificate}`);
    console.log(`Pending Updates: ${status.pending_update_count}`);
    if (status.last_error_date) {
      console.log(`Last Error Date: ${new Date(status.last_error_date * 1000)}`);
      console.log(`Last Error Message: ${status.last_error_message}`);
    }
    console.log("----------------------\n");
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

main();
