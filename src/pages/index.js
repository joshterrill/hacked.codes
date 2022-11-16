import * as React from "react";
import { Link, graphql } from "gatsby";
// import { StaticImage } from "gatsby-plugin-image"

import Bio from "../components/bio";
import Layout from "../components/layout";
import Seo from "../components/seo";

const BlogIndex = ({ data, location }) => {
    const siteTitle = data.site.siteMetadata?.title || `Title`;
    const siteDescription = data.site.siteMetadata?.description || `Description`;
    const posts = data.allMarkdownRemark.nodes;

    if (posts.length === 0) {
        return (
            <Layout location={location} title={siteTitle}>
                <Bio />
                <p>
                    No blog posts found. Add markdown posts to "content/blog" (or the directory you
                    specified for the "gatsby-source-filesystem" plugin in gatsby-config.js).
                </p>
            </Layout>
        );
    }

    return (
        <Layout location={location} title={siteTitle}>
            <div className="bio">
                <p
                    style={{
                        fontSize: `0.8rem`,
                        lineHeight: `1.6em`,
                    }}
                >
                    {siteDescription}
                </p>
            </div>
            <ol style={{ listStyle: `none` }}>
                {posts.map(post => {
                    const title = post.frontmatter.title || post.fields.slug;

                    return (
                        <li key={post.fields.slug}>
                            <article
                                className="post-list-item"
                                itemScope
                                itemType="http://schema.org/Article"
                            >
                                <header>
                                    <h2>
                                        <Link to={post.fields.slug} itemProp="url">
                                            <span itemProp="headline">{title}</span>
                                        </Link>
                                    </h2>
                                    <small className="post-date">{post.frontmatter.date}</small>
                                </header>
                                <section>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: post.frontmatter.description || post.excerpt,
                                        }}
                                        itemProp="description"
                                    />
                                </section>
                            </article>
                        </li>
                    );
                })}
            </ol>
        </Layout>
    );
};

export default BlogIndex;

export const Head = () => <Seo title="Home" />;

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
                description
            }
        }
        allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
            nodes {
                excerpt
                fields {
                    slug
                }
                frontmatter {
                    date(formatString: "MMMM DD, YYYY")
                    title
                    description
                    tags
                }
            }
        }
    }
`;
