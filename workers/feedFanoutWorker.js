const { Kafka } = require('kafkajs');
const dedup = require('../src/utils/dedupStore');
const kafka = new Kafka({clientId:'feed-worker', brokers:['localhost:9092']});
const consumer = kafka.consumer({groupId:'feed-worker-group'});

(async ()=>{
  await consumer.connect();
  await consumer.subscribe({topic:'post.created', fromBeginning:true});
  await consumer.run({
    eachMessage: async ({message})=>{
      const event = JSON.parse(message.value.toString());
      if(dedup.has(event.eventId)) return;
      console.log('Updating feed cache for', event.postId);
      dedup.add(event.eventId);
    }
  });
})();
