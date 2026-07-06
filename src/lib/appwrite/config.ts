'use client'

import { Client, Account, Databases, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("6a3e7198000ec6f57a70");

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };
