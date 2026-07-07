const { Kafka } = require('kafkajs');
const kafka = new Kafka({clientId:'social-app', brokers:['localhost:9092']});
const producer = kafka.producer();

async function connectProducer(){ await producer.connect(); }

async function publishPostCreated(event){
  await producer.send({
    topic:'post.created',
    messages:[{ key:event.postId, value:JSON.stringify(event) }]
  });
}

module.exports = { connectProducer, publishPostCreated, producer };
