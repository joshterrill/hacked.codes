import React from "react";
import PropTypes from "prop-types";

// Components
import { Link, graphql } from "gatsby";
import Layout from "../components/layout";
import Seo from "../components/seo";

const Tags = ({ pageContext, data, location }) => {
    const { tag } = pageContext;
    const { edges, totalCount } = data.allMarkdownRemark;
    const { title } = data.site.siteMetadata;
    const tagHeader = `${totalCount} post${totalCount === 1 ? "" : "s"} tagged with "${tag}"`;

    return (
        <Layout location={location} title={title}>
            <div>
                <h1>{tagHeader}</h1>
                <ul>
                    {edges.map(({ node }) => {
                        const { slug } = node.fields;
                        const { title } = node.frontmatter;
                        return (
                            <li key={slug}>
                                <Link to={slug}>{title}</Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="all-tags" style={{ marginBottom: "calc(var(--spacing-6) / 2)" }}>
                    <Link to="/tags">All tags</Link>
                </div>
            </div>
        </Layout>
    );
};

export const Head = ({ pageContext }) => {
    return <Seo title={`Posts tagged with '${pageContext.tag}'`} />;
};

Tags.propTypes = {
    pageContext: PropTypes.shape({
        tag: PropTypes.string.isRequired,
    }),
    data: PropTypes.shape({
        allMarkdownRemark: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
            edges: PropTypes.arrayOf(
                PropTypes.shape({
                    node: PropTypes.shape({
                        frontmatter: PropTypes.shape({
                            title: PropTypes.string.isRequired,
                        }),
                        fields: PropTypes.shape({
                            slug: PropTypes.string.isRequired,
                        }),
                    }),
                }).isRequired
            ),
        }),
        site: PropTypes.shape({
            siteMetadata: PropTypes.shape({
                title: PropTypes.string.isRequired,
            }),
        }),
    }),
};

export default Tags;

export const pageQuery = graphql`
    query ($tag: String) {
        allMarkdownRemark(
            limit: 2000
            sort: { frontmatter: { date: DESC } }
            filter: { frontmatter: { tags: { in: [$tag] }, published: { eq: true } } }
        ) {
            totalCount
            edges {
                node {
                    fields {
                        slug
                    }
                    frontmatter {
                        title
                    }
                }
            }
        }
        site {
            siteMetadata {
                title
            }
        }
    }
`;
