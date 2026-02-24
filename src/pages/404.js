import * as React from "react";
import { graphql } from "gatsby";

import Layout from "../components/layout";
import Seo from "../components/seo";

const NotFoundPage = ({ data, location }) => {
    const siteTitle = data.site.siteMetadata.title;

    return (
        <Layout location={location} title={siteTitle}>
            <h1>404: Not Found</h1>
            <p>
                The page you're looking for does not exist, <a href="/">go back home.</a>
            </p>
        </Layout>
    );
};

export const Head = ({ location }) => <Seo title="404: Not Found" pathname={location.pathname} />;

export default NotFoundPage;

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`;
