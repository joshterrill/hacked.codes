module.exports = {
    siteMetadata: {
        title: `hacked.codes`,
        description: `Articles on hacking, reverse engineering, and software development.`,
        author: {
            name: `Josh Terrill`,
            avatar: `static/images/profile-pic.jpeg`,
        },
        siteUrl: `https://hacked.codes/`,
        social: {
            twitter: `joshterrill`,
            github: `joshterrill`,
        },
    },
    plugins: [
        `gatsby-plugin-image`,
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                name: `blog`,
                path: `${__dirname}/content/blog`,
            },
        },
        {
            resolve: `gatsby-plugin-sitemap`,
            options: {
                excludes: [`/404`, `/404.html`],
            },
        },
        {
            resolve: `gatsby-transformer-remark`,
            options: {
                plugins: [
                    `gatsby-remark-autolink-headers`,
                    {
                        resolve: `gatsby-remark-images`,
                        options: {
                            maxWidth: 800,
                        },
                    },
                    {
                        resolve: `gatsby-remark-responsive-iframe`,
                        options: {
                            wrapperStyle: `margin-bottom: 1.0725rem`,
                        },
                    },
                    {
                        resolve: `gatsby-remark-embed-gist`,
                        options: {
                            gistDefaultCssInclude: false,
                        }
                    },
                    {
                        resolve: `gatsby-remark-prismjs`,
                        options: {
                            classPrefix: "language-",
                            inlineCodeMarker: null,
                            aliases: {
                                sh: "bash",
                                zsh: "bash",
                            },
                            showLineNumbers: false,
                            noInlineHighlight: false,
                            prompt: {
                                user: "root",
                                host: "localhost",
                                global: false,
                            },
                            escapeEntities: {},
                        },
                    },
                    `gatsby-remark-copy-linked-files`,
                    `gatsby-remark-smartypants`,
                ],
            },
        },
        {
            resolve: `gatsby-plugin-sharp`,
            options: {
                defaults: {
                    quality: 100,
                    // jpgOptions: {
                    //     progressive: true,
                    //     quality: 100,
                    // },
                    // pngOptions: {
                    //     quality: 100,
                    // },
                    // webpOptions: {
                    //     quality: 100,
                    // },
                },
            },
        },
        `gatsby-transformer-sharp`,

        {
            resolve: `gatsby-plugin-feed`,
            options: {
                query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
                feeds: [
                    {
                        serialize: ({ query: { site, allMarkdownRemark } }) => {
                            return allMarkdownRemark.nodes.map(node  => {
                              return Object.assign({}, node.frontmatter, {
                                description: node.excerpt,
                                date: node.frontmatter.date,
                                url: site.siteMetadata.siteUrl + node.fields.slug,
                                guid: site.siteMetadata.siteUrl + node.fields.slug,
                                custom_elements: [{ "content:encoded": node.html }],
                              });
                            });
                        },
                        query: `
              {
                allMarkdownRemark(
                  filter: { frontmatter: { published: { eq: true } } },
                  sort: { order: DESC, fields: [frontmatter___date] },
                ) {
                  nodes {
                    excerpt
                    html
                    fields {
                      slug
                    }
                    frontmatter {
                      title
                      date
                    }
                  }
                }
              }
            `,
                        output: "/rss.xml",
                        title: "hacked.codes",
                    },
                ],
            },
        },
        {
            resolve: `gatsby-plugin-manifest`,
            options: {
                name: `hacked.codes Blog`,
                short_name: `hacked.codes`,
                start_url: `/`,
                background_color: `#ffffff`,
                theme_color: `#1d1e26`,
                display: `minimal-ui`,
                icon: `static/images/favicon.png`,
            },
        },
    ],
};
