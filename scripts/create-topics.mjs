import "dotenv/config";
import { Kafka } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",").map((item) => item.trim());
const topics = [
  "target.created",
  "crawl.requested",
  "crawl.page.captured",
  "crawl.completed",
  "simulation.requested",
  "simulation.completed",
  "journey.event.captured",
  "stack-detection.requested",
  "stack.detected",
  "email-sync.requested",
  "email.ingested",
  "ad-sync.requested",
  "ad.ingested",
  "funnel-analysis.requested",
  "funnel.reconstructed",
  "monitoring.requested",
  "change.detected",
  "report-generation.requested",
  "report.generated",
  "alert.triggered"
];
const allTopics = [...topics, ...topics.map((topic) => `${topic}.dlq`)];

const kafka = new Kafka({
  clientId: "funnel-topic-bootstrap",
  brokers
});

const admin = kafka.admin();
await admin.connect();
const existingTopics = new Set(await admin.listTopics());
const missingTopics = allTopics.filter((topic) => !existingTopics.has(topic));
if (missingTopics.length > 0) {
  await admin.createTopics({
    waitForLeaders: true,
    topics: missingTopics.map((topic) => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1
    }))
  });
}
await admin.disconnect();
console.log(`Topics created or already present. Missing created: ${missingTopics.length}`);
