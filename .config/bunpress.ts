import type { BunPressOptions } from '@stacksjs/bunpress'

const config: BunPressOptions = {
  title: 'very-happy-dom',
  description: 'A blazingly fast, lightweight virtual DOM powered by Bun. Drop-in replacement for happy-dom and jsdom in testing environments.',
  url: 'https://very-happy-dom.stacksjs.org',

  themeConfig: {
    colors: {
      primary: '#3b82f6',
    },
  },

  nav: [
    { text: 'Guide', link: '/intro' },
    { text: 'Drop-in Compat', link: '/drop-in-compat' },
    { text: 'API', link: '/api' },
    {
      text: 'Stacks',
      items: [
        { text: 'Stacks Framework', link: 'https://stacksjs.org' },
        { text: 'BunPress', link: 'https://bunpress.sh' },
        { text: 'dtsx', link: 'https://dtsx.stacksjs.org' },
      ],
    },
    { text: 'GitHub', link: 'https://github.com/stacksjs/very-happy-dom' },
  ],

  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is very-happy-dom?', link: '/intro' },
        { text: 'Installation', link: '/install' },
        { text: 'Usage', link: '/usage' },
      ],
    },
    {
      text: 'Migration',
      items: [
        { text: 'Drop-in Compatibility', link: '/drop-in-compat' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'API Reference', link: '/api' },
        { text: 'Configuration', link: '/config' },
        { text: 'Performance', link: '/performance' },
      ],
    },
    {
      text: 'Project',
      items: [
        { text: 'Showcase', link: '/showcase' },
        { text: 'Team', link: '/team' },
        { text: 'Sponsors', link: '/sponsors' },
        { text: 'Partners', link: '/partners' },
        { text: 'Postcardware', link: '/postcardware' },
        { text: 'Stargazers', link: '/stargazers' },
        { text: 'License', link: '/license' },
      ],
    },
  ],

  sitemap: {
    enabled: true,
    baseUrl: 'https://very-happy-dom.stacksjs.org',
  },

  robots: {
    enabled: true,
  },
}

export default config
