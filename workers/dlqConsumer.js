const { Kafka } = require('kafkajs');
const kafka = new Kafka({clientId:'dlq-consumer', brokers:['localhost:9092']});
const consumer = kafka.consumer({groupId:'dlq-group'});
(async ()=>{
  await consumer.connect();
  await consumer.subscribe({topic:'post.created.dlq'});
  await consumer.run({
    eachMessage: async ({message})=>{
      console.log('DLQ EVENT:', message.value.toString());
    }
  });
})();
