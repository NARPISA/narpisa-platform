# NaRPISA PDF Worker

This service accepts source-processing requests, creates queued jobs, and processes PDFs transiently without persisting file binaries. In production it runs on Google Cloud Run with Cloud Tasks handling asynchronous retries and delivery.
