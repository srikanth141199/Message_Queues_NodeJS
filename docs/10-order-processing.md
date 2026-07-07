# docs/10-order-processing.md

# Order Processing System for E-Commerce

## 1. Problem Statement

An e-commerce platform processes thousands of orders per minute, especially during flash sales and festive events. When a customer places an order, multiple operations need to occur:

1. Create Order
2. Validate Inventory
3. Process Payment
4. Generate Shipment
5. Send Notifications
6. Update Analytics
7. Update Recommendation Engine

Performing all these operations synchronously increases response time and reduces scalability. Therefore, an event-driven architecture with message queues is required.

---

# 2. High-Level Architecture

```text
                        +----------------+
                        |    Customer    |
                        +--------+-------+
                                 |
                                 v
                        +----------------+
                        |   Order API    |
                        +--------+-------+
                                 |
                                 v
                        +----------------+
                        |  Orders DB     |
                        +--------+-------+
                                 |
                                 v
                      Publish order.created
                                 |
                                 v
                         +---------------+
                         |     Kafka     |
                         +---------------+
                          |      |      |
                          |      |      |
                          v      v      v
                   Inventory  Payment  Analytics
                    Worker     Worker    Worker
                          |
                          v
                   Shipping Worker
                          |
                          v
                  Notification Worker
```

---

# 3. Synchronous vs Asynchronous Boundaries

## Synchronous Operations

The following operations must complete before the customer receives a response:

1. Create Order Record
2. Validate Product Availability
3. Reserve Inventory
4. Initiate Payment

These operations directly affect whether the order is accepted.

---

## Asynchronous Operations

The following operations can execute in the background:

1. Send Email
2. Send SMS
3. Update Analytics
4. Update Recommendations
5. Generate Reports
6. Loyalty Points Processing

---

## Flow

```text
Customer
   |
   v
Place Order
   |
   v
Save Order
   |
   v
Reserve Inventory
   |
   v
Payment Success
   |
   v
Return Response
   |
   v
Publish order.created Event
   |
   +-----> Notification Service
   |
   +-----> Analytics Service
   |
   +-----> Recommendation Service
```

---

# Why Async?

Suppose:

| Operation    | Time   |
| ------------ | ------ |
| Save Order   | 50 ms  |
| Inventory    | 100 ms |
| Payment      | 200 ms |
| Notification | 500 ms |
| Analytics    | 300 ms |

## Fully Synchronous

```text
50 + 100 + 200 + 500 + 300
= 1150 ms
```

## Hybrid Architecture

```text
50 + 100 + 200
= 350 ms
```

Response time decreases from **1150 ms to 350 ms**.

---

# 4. Queue Choice

## Selected Broker: Apache Kafka

### Reasons

### High Throughput

Can process millions of messages per second.

### Persistence

Messages remain on disk.

### Replay Support

Consumers can reprocess events.

### Consumer Groups

Allows multiple independent services.

### Horizontal Scalability

Partitions can be distributed across brokers.

---

# Kafka Topics

```text
order.created
payment.completed
shipment.created
notifications
order.dlq
```

---

# 5. Delivery Semantics

## Payment Service

### Exactly Once

Double charging a customer is unacceptable.

```text
Customer pays ₹10,000

Duplicate processing:
₹20,000 deducted ❌
```

Therefore:

```text
Payment → Exactly Once
```

---

## Notifications

### At Least Once

Duplicate emails are acceptable.

Missing emails are not.

```text
Notification → At Least Once
```

---

## Analytics

### At Most Once

Losing a few analytics events is acceptable.

```text
Page views
Product impressions
Search metrics
```

---

# Delivery Summary

| Service      | Delivery Semantics |
| ------------ | ------------------ |
| Payment      | Exactly Once       |
| Notification | At Least Once      |
| Analytics    | At Most Once       |

---

# 6. Retry Strategy

Transient failures happen because of:

* Database downtime
* Network errors
* Third-party APIs
* Payment gateway delays

---

## Retry Policy

```text
Attempt 1
Attempt 2
Attempt 3
Move to DLQ
```

---

## Exponential Backoff

```text
Retry 1 → 1 sec
Retry 2 → 2 sec
Retry 3 → 4 sec
```

Benefits:

* Reduces load on dependencies.
* Avoids retry storms.
* Improves system stability.

---

# 7. Dead Letter Queue (DLQ)

Events that continuously fail are moved to a Dead Letter Queue.

---

## Example

Payment service fails:

```text
orderId = ORD123
```

Retries:

```text
1 → Failed
2 → Failed
3 → Failed
```

Move event:

```text
order.dlq
```

---

## DLQ Flow

```text
Order Event
     |
     v
Consumer
     |
     v
Retry 1
Retry 2
Retry 3
     |
     v
Dead Letter Queue
```

Operations team can inspect and replay failed events.

---

# 8. Idempotent Consumers

Because Kafka provides at-least-once delivery, consumers may process duplicate events.

Consumers must be idempotent.

---

## Dedup Table

```text
processed_events
----------------
event_id
processed_at
```

---

## Processing Flow

```text
Receive Event
      |
      v
Already Processed?
      |
   Yes ----> Ignore
      |
      No
      |
      v
Process Event
      |
      v
Store event_id
```

---

# Example

```text
event_id = abc123
```

First delivery:

```text
Process Payment
```

Second delivery:

```text
Ignore
```

---

# 9. Backpressure During Sales Spikes

## Scenario

Flash Sale:

```text
50,000 orders/minute
```

Consumers can process:

```text
10,000 orders/minute
```

A backlog starts building.

---

# Strategy 1: Bounded Queue

```text
Max Queue Size = 10,000
```

If full:

```text
Reject new events
```

---

# Strategy 2: Consumer Scaling

```text
1 Consumer
2 Consumers
4 Consumers
8 Consumers
```

Kafka consumer groups enable horizontal scaling.

---

# Strategy 3: Load Shedding

Low-priority work can be dropped.

Examples:

* Recommendation updates
* Analytics updates
* Product impression tracking

Critical services continue operating.

---

# Backpressure Architecture

```text
Kafka
   |
   v
Consumer Queue
   |
   +-----> Inventory
   |
   +-----> Payment
   |
   +-----> Shipping
   |
   +-----> Notifications
```

When queue becomes full:

```text
Drop non-critical events
Scale consumers
Throttle producers
```

---

# Final Architecture

```text
Customer
    |
    v
Order API
    |
    v
Orders DB
    |
    v
Kafka
    |
    +------> Inventory Worker
    |
    +------> Payment Worker
    |
    +------> Shipping Worker
    |
    +------> Notification Worker
    |
    +------> Analytics Worker
    |
    +------> Recommendation Worker
    |
    +------> Dead Letter Queue
```

---

# Deliverables

✅ Kafka Broker Setup

✅ Two Workers

1. Payment Worker
2. Notification Worker

✅ Idempotent Consumer

✅ Retry Mechanism

✅ Dead Letter Queue

✅ Backpressure Demonstration

✅ Event-Driven Order Processing Architecture

This architecture provides:

* Low latency
* High throughput
* Fault tolerance
* Scalability
* Reliable event processing
* Isolation between services
* Resilience during flash sales and traffic spikes.
