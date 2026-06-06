import { defineConfig } from 'orval';

export default defineConfig({
  iws: {
    input: '../api/openapi.json',
    output: {
      mode: 'tags-split',
      target: 'src/lib/api/generated',
      schemas: 'src/lib/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: 'src/lib/api/axios.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
