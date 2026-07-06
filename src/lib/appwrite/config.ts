'use client'

import { Client, Account, Databases, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a3e7198000ec6f57a70");

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };

