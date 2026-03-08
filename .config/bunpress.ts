import type { BunPressOptions } from 'bunpress'

const config: BunPressOptions = {
  name: 'clapp',
  description: 'An elegant, TypeScript-first CLI framework built on Bun for creating beautiful command-line applications with interactive prompts.',
  url: 'https://clapp.stacksjs.org',

  theme: {
    primaryColor: '#3b82f6',
  },

  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'Commands', link: '/guide/commands' },
    { text: 'Prompts', link: '/guide/prompts' },
    {
      text: 'Stacks',
      items: [
        { text: 'Stacks Framework', link: 'https://stacksjs.org' },
        { text: 'BunPress', link: 'https://bunpress.sh' },
        { text: 'dtsx', link: 'https://dtsx.stacksjs.org' },
      ],
    },
    { text: 'GitHub', link: 'https://github.com/stacksjs/clapp' },
  ],

  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is clapp?', link: '/intro' },
        { text: 'Installation', link: '/install' },
      ],
    },
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Commands', link: '/guide/commands' },
        { text: 'Prompts', link: '/guide/prompts' },
        { text: 'Testing', link: '/guide/testing' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'Arguments & Options', link: '/features/arguments' },
        { text: 'Interactive Prompts', link: '/features/prompts' },
        { text: 'Output Styling', link: '/features/styling' },
        { text: 'Progress Indicators', link: '/features/progress' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Configuration', link: '/advanced/configuration' },
        { text: 'Plugins', link: '/advanced/plugins' },
        { text: 'Performance', link: '/advanced/performance' },
        { text: 'CI/CD Integration', link: '/advanced/ci-cd' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'Configuration', link: '/config' },
        { text: 'Styling', link: '/styling' },
        { text: 'Usage Examples', link: '/usage' },
      ],
    },
  ],

  sitemap: {
    enabled: true,
    baseUrl: 'https://clapp.stacksjs.org',
  },

  robots: {
    enabled: true,
  },
}

export default config
