# Sneaker Drop

A small shoe brand is launching one limited sneaker. They only have 20 pairs. When the sale opens, thousands of people will click Buy at the same second.

Last time, their website sold 51 pairs when they only had 20, and they had to refund 31 people. Your job is to build the full system for the next sale so this never happens again.

## The rules

1. When a user clicks Buy, one pair is held for them for 5 minutes. If they don't pay in time, the pair goes back to stock.
2. A user can hold only 1 pair at a time, and can buy a maximum of 2 pairs in total.
3. If stock is 0, users can join a waiting line. When someone's hold runs out, the first person in line automatically gets that pair, with their own 5 minutes.
4. Payments are fake. You don't need to build a real payment system, just make your own simple fake one that sends your app a "payment succeeded" message, like a real payment company would. Real ones are messy, so sometimes the message comes late, sometimes twice, sometimes in the wrong order.
5. One page shows the pairs left, the user's hold countdown, and their place in the waiting line. It doesn't need to look good, plain text is fine.

Use any language or tools you are comfortable with.

## Demo Videos

Recordings of the system running are committed under [`assets/`](./assets). The main walkthrough is `intro.mp4`.

| Video | Duration | Shows |
| --- | --- | --- |
| [Intro & full walkthrough](./assets/intro.mp4) | 5:00 | Architecture, concurrency guarantees, hold and queue flow, payment edge cases |
| [Seed](./assets/seed.mp4) | 0:11 | Seeding the drop with 20 pairs |
| [Unit tests](./assets/unit_test.mp4) | 0:09 | Reservation, queue and payment idempency tests |
| [Integration tests](./assets/integration_test.mp4) | 0:10 | Purchase flow, hold expiry, queue promotion |
| [Concurrency tests](./assets/concurrency_tests.mp4) | 0:07 | 100 simultaneous Buy requests with zero overselling |
| [All tests](./assets/all_tests.mp4) | 0:15 | Full suite, 18 tests |
| [Payments](./assets/payments.mp4) | 0:11 | Completing a purchase with the fake payment provider |
| [Payment simulation](./assets/payments_simulation.mp4) | 0:10 | Duplicate, delayed and out-of-order webhook events |

## What you send back

1. Your code (repo or zip)
2. A NOTES.md file that tells how to run the project, and any other requirements that are needed
3. A screen recording (Loom or any tool you like) where you explain your project

Please fork this repo and build your project in your fork.
