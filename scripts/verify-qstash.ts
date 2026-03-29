import { Client } from "@upstash/qstash";
import dotenv from "dotenv";

dotenv.config();

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL || undefined,
});

async function verify() {
  console.log("--- QStash Connection Verification ---");
  console.log(`Token: ${(process.env.QSTASH_TOKEN || "").substring(0, 8)}...`);
  console.log(`URL: ${process.env.QSTASH_URL || "Default"}`);

  try {
    const res = await qstash.publishJSON({
      url: "https://example.com/worker-test",
      body: { test: true },
    });

    console.log("✅ Success! QStash Message ID:", res.messageId);
  } catch (err: any) {
    console.error("❌ Failed!");
    console.error("Error Message:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data));
    }
  }
}

verify();
