import { defineConfig } from 'orval';

export default defineConfig({
  iws: {
    input: '../../apps/api/openapi.json',
    output: {
      mode: 'tags-split',
      target: 'src/generated',
      schemas: 'src/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: 'src/axios.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
