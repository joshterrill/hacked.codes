/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react";
import PropTypes from "prop-types";
import { useStaticQuery, graphql } from "gatsby";

const Seo = ({ description, title, image, children }) => {
    const { site } = useStaticQuery(
        graphql`
            query {
                site {
                    siteMetadata {
                        title
                        description
                        social {
                            twitter
                        }
                    }
                }
            }
        `
    );

    // TODO: check if this is the right way to do this -jt
    const metaDescription = description || site.siteMetadata.description;
    const defaultTitle = site.siteMetadata?.title;
    const displayTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
    const metaImage = image ? image : "https://hacked.codes/images/favicon.png";
    return (
        <>
            <title>{displayTitle}</title>
            <meta name="description" content={metaDescription} />
            <meta property="og:title" content={displayTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:type" content="website" />
            {image ? <meta name="twitter:card" content="summary_large_image" /> : <meta name="twitter:card" content="summary" />}
            <meta name="twitter:image" content={metaImage} />
            <meta name="twitter:creator" content={`@${site.siteMetadata?.social?.twitter}`} />
            <meta name="twitter:title" content={displayTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <link rel="stylesheet" type="text/css" href="/asciinema-player.css" />
            <script src="/asciinema-player.min.js"></script>
            <script src="/load-player.js"></script>
            {children}
        </>
    );
};

Seo.defaultProps = {
    description: ``,
};

Seo.propTypes = {
    description: PropTypes.string,
    title: PropTypes.string.isRequired,
};

export default Seo;
