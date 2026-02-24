/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react";
import PropTypes from "prop-types";
import { useStaticQuery, graphql } from "gatsby";

const escapeJsonLd = (str) => str?.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') || '';

const Seo = ({ description = '', title, image, isPost, publishedTime, publishedTimeISO, primaryTag, tags, pathname = '' }) => {
    const { site } = useStaticQuery(
        graphql`
            query {
                site {
                    siteMetadata {
                        title
                        description
                        siteUrl
                        social {
                            x
                        }
                    }
                }
            }
        `
    );

    const siteUrl = site.siteMetadata.siteUrl;
    const metaDescription = description || site.siteMetadata.description;
    const defaultTitle = site.siteMetadata?.title;
    const displayTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
    const metaUrl = `${siteUrl}${pathname}`;
    
    const absoluteImage = image
        ? (image.startsWith('http') ? image : `${siteUrl}${image}`)
        : `${siteUrl}/images/favicon.png`;

    const twitterHandle = site.siteMetadata?.social?.x;

    return (
        <>
            <title>{displayTitle}</title>
            <link rel="canonical" href={metaUrl} />
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" />
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-SM9F2HGDV4"></script>
            <script>
                {
                    `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', 'G-SM9F2HGDV4');
                    `
                }
            </script>
            <meta name="description" content={metaDescription} />
            <meta property="og:site_name" content="hacked.codes" />
            <meta property="og:locale" content="en_US" />
            <meta property="og:type" content={isPost ? "article" : "website"} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:image" content={absoluteImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:title" content={displayTitle} />
            <meta property="og:description" content={metaDescription} />
            {image ? (
                <meta name="twitter:card" content="summary_large_image" />
            ) : (
                <meta name="twitter:card" content="summary" />
            )}
            <meta name="twitter:image" content={absoluteImage} />
            <meta name="twitter:site" content={`@${twitterHandle}`} />
            <meta name="twitter:creator" content={`@${twitterHandle}`} />
            <meta name="twitter:title" content={displayTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {isPost ? (
                <>
                    <meta property="article:published_time" content={publishedTimeISO || publishedTime} />
                    <meta property="article:section" content={primaryTag} />
                    {tags?.map(tag => (
                        <meta key={tag} property="article:tag" content={tag} />
                    ))}
                    <script type="application/ld+json">
                        {`{
                            "@context": "https://schema.org/",
                            "@type": "NewsArticle",
                            "headline": "${escapeJsonLd(displayTitle)}",
                            "description": "${escapeJsonLd(description)}",
                            "image": ["${absoluteImage}"],
                            "datePublished": "${publishedTimeISO || publishedTime}",
                            "url": "${metaUrl}",
                            "mainEntityOfPage": {
                                "@type": "WebPage",
                                "@id": "${metaUrl}"
                            },
                            "author": [{
                                "@type": "Person",
                                "name": "Josh Terrill"
                            }],
                            "publisher": {
                                "@type": "Organization",
                                "name": "hacked.codes",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": "${siteUrl}/images/favicon.png"
                                }
                            }
                        }`}
                    </script>

                    <script src="/asciinema-player.min.js"></script>
                    <link rel="stylesheet" type="text/css" href="/gist.css" />
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
                    <meta name="robots" content="index,follow" />
                    <script type="application/ld+json">
                        {`{
                            "@context": "https://schema.org/",
                            "@type": "CollectionPage",
                            "headline": "${escapeJsonLd(defaultTitle)}",
                            "description": "${escapeJsonLd(metaDescription)}",
                            "url": "${metaUrl}",
                            "publisher": {
                                "@type": "Organization",
                                "name": "hacked.codes",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": "${siteUrl}/images/favicon.png"
                                }
                            }
                        }`}
                    </script>
                    <script async defer src="/hello-there.js"></script>
                </>
            )}
        </>
    );
};

Seo.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string,
    isPost: PropTypes.bool,
    publishedTime: PropTypes.string,
    publishedTimeISO: PropTypes.string,
    primaryTag: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    pathname: PropTypes.string,
};

export default Seo;
