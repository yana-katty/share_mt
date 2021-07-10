import { legacyPlugin } from '@web/dev-server-legacy';

export default {
    plugins: [
        // make sure this plugin is always last
        legacyPlugin(),
    ],
};