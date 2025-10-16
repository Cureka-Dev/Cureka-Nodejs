// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: "/app.js",
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'module', // <-- Output ESM
    environment: {
      module: true
    }
  },
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.js']
  }
};
