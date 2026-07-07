const fs = require('fs');
const { Kafka } = require('kafkajs');
const dedup = require('../src/utils/dedupStore');
const kafka = new Kafka({clientId:'notification-worker', brokers:['localhost:9092']});
const consumer = kafka.consumer({groupId:'notification-group'});

(async ()=>{
  await consumer.connect();
  await consumer.subscribe({topic:'post.created', fromBeginning:true});
  await consumer.run({
    eachMessage: async ({message})=>{
      const event = JSON.parse(message.value.toString());
      if(dedup.has(event.eventId)) return;
      fs.appendFileSync('./logs/notifications.log',
        `User ${event.userId} created post ${event.postId}\n`);
      dedup.add(event.eventId);
    }
  });
})();
