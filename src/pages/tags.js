import React from "react";
import PropTypes from "prop-types";
import { Link, graphql } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";

const TagsPage = ({
    location,
    data: {
        allMarkdownRemark: { group },
        site: {
            siteMetadata: { title },
        },
    },
}) => (
    <Layout location={location} title={title}>
        <div>
            <h1>All Tags</h1>
            <ul>
                {group.map(tag => {
                    return (
                        <li key={tag.fieldValue}>
                            <Link to={`/tags/${tag.fieldValue}/`}>
                                {tag.fieldValue} ({tag.totalCount})
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    </Layout>
);

export const Head = () => {
    return <Seo title="All Tags" />;
};

TagsPage.propTypes = {
    data: PropTypes.shape({
        allMarkdownRemark: PropTypes.shape({
            group: PropTypes.arrayOf(
                PropTypes.shape({
                    fieldValue: PropTypes.string.isRequired,
                    totalCount: PropTypes.number.isRequired,
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

export default TagsPage;

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
        allMarkdownRemark(limit: 2000, filter: { frontmatter: { published: { eq: true } } }) {
            group(field: frontmatter___tags) {
                fieldValue
                totalCount
            }
        }
    }
`;
