/// <reference types="vite/client" />

interface ImportMetaEnv {
  DEV: boolean;
  VITE_MOCK_INIT_DATA: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

export {};
