CREATE DATABASE usertest;

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('student', 'professor'))
);
