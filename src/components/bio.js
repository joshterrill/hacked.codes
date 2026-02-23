/**
 * Bio component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react";
import { useStaticQuery, graphql } from "gatsby";
import { StaticImage } from "gatsby-plugin-image";

const Bio = () => {
    const data = useStaticQuery(graphql`
        query BioQuery {
            site {
                siteMetadata {
                    social {
                        x
                        github
                    }
                }
            }
        }
    `);

    const { x, github } = data.site.siteMetadata?.social;

    return (
        <div className="bio">
            <StaticImage
                className="bio-avatar"
                layout="fixed"
                formats={["auto", "webp", "avif"]}
                src="../../static/images/profile-pic.jpeg"
                width={60}
                height={60}
                quality={95}
                alt="Profile picture"
            />
            <p
                style={{
                    fontSize: `0.8rem`,
                    lineHeight: `1.6em`,
                }}
            >
                <strong>Josh Terrill</strong> - Software Engineer
                <br />
                Follow me on{" "}
                <a href={`https://x.com/${x}`} target="_blank" rel="noreferrer">
                    X
                </a>{" "}
                and{" "}
                <a href={`https://github.com/${github}`} target="_blank" rel="noreferrer">
                    Github
                </a>
                .
                <br />
                Click <a href="/contact.txt">here</a> for contact info.
            </p>
        </div>
    );
};

export default Bio;
