import * as React from "react";

const Tags = (props) => {

    const renderTag = (tag, index, tagCount) => {
        return (
            <span>
                <a key={`tag-${tag}`} href={`/tags/${tag}/`} className={`tag ${tag}`}>
                    {tag}
                </a>
                {index + 1 < tagCount ? ", " : ""}
            </span>
            
        );
    };

    return (
        <section className="post-tags">
            {props.tags.length > 0 && 
                <div>Tags: {props.tags.map((tag, i) => renderTag(tag, i, props.tags.length))}</div>
            }
        </section>
    )

}

export default Tags;