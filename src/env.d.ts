/// <reference path="../.astro/types.d.ts" />

type Viewer = import('./study/auth/viewer').Viewer;

declare namespace App {
  interface Locals {
    viewer: Viewer | null;
  }
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

declare module 'cloudflare:workers' {
  export const env: {
    DB: D1Database;
    STUDY_PIN: string;
  };
}
