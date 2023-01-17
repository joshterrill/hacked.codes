/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react";
import PropTypes from "prop-types";
import { useStaticQuery, graphql } from "gatsby";

const Seo = ({ description, title, image, isPost, publishedTime, primaryTag }) => {
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

    const metaDescription = description || site.siteMetadata.description;
    const defaultTitle = site.siteMetadata?.title;
    const displayTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
    const metaImage = image ? image : "/images/favicon.png";
    const metaUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
        <>
            <title>{displayTitle}</title>
            <meta name="description" content={metaDescription} />
            <meta property="og:site_name" content="hacked.codes" />
            <meta property="og:type" content={isPost ? "article" : "website"} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:title" content={displayTitle} />
            <meta property="og:description" content={metaDescription} />
            {image ? (
                <meta name="twitter:card" content="summary_large_image" />
            ) : (
                <meta name="twitter:card" content="summary" />
            )}
            <meta name="twitter:image" content={metaImage} />
            <meta name="twitter:creator" content={`@${site.siteMetadata?.social?.twitter}`} />
            <meta name="twitter:title" content={displayTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {isPost ? (
                <>
                    {/* is a post */}
                    <meta name="article:published_time" content={publishedTime} />
                    <meta name="article:section" content={primaryTag} />
                    <script type="application/ld+json">
                        {`{
                                "@context": "https://schema.org/",
                                "@type": "NewsArticle",
                                "headline": "${displayTitle}",
                                "description": "${description}",
                                "image": ["${metaImage}"],
                                "datePublished": "${publishedTime}",
                                "author": [{
                                    "@type": "Person",
                                    "name": "Josh Terrill"
                                }]
                            }`}
                    </script>

                    <script src="/asciinema-player.min.js"></script>
                    <link rel="stylesheet" type="text/css" href="/asciinema-player.css" />
                    <script>
                        {typeof document !== "undefined" &&
                            setTimeout(() => {
                                const docs = document.querySelectorAll(".ascii-player");
                                for (const doc of docs) {
                                    const path = doc.getAttribute("data-path");
                                    window.AsciinemaPlayer.create(path, doc, {
                                        terminalFontSize: "30px",
                                        fit: "width",
                                        poster: "npt:1:23",
                                        idleTimeLimit: 2,
                                        cols: 100,
                                        rows: 20,
                                    });
                                }
                            }, 300)}
                    </script>
                </>
            ) : (
                <>
                    {/* not a post */}
                    <meta name="robots" content="index,follow" />
                    <script type="application/ld+json">
                        {`{
                            "@context": "https://schema.org/",
                            "@type": "CollectionPage",
                            "headline": "${defaultTitle}",
                            "description": "${metaDescription} Written by Josh Terrill"
                        }`}
                    </script>
                </>
            )}
        </>
    );
};

Seo.defaultProps = {
    description: ``,
};

Seo.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    image: PropTypes.string,
    isPost: PropTypes.bool,
    publishedTime: PropTypes.string,
    primaryTag: PropTypes.string,
};

export default Seo;
