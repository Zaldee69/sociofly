# Social Media Feature

This directory contains all code related to social media management functionality.

## Structure

```
social/
├── components/    # Social media UI components
├── hooks/         # Social media related hooks
├── api/           # Social media API routes
├── services/      # Services for social media platforms
└── utils/         # Social media utility functions
```

## Components

Social media related components include:

- `HashtagSearch` - Component for searching hashtags
- `HashtagBrowser` - Component for browsing popular hashtags
- `PostPreview` - Preview for social media posts
- `SocialAccountSelector` - For selecting social media accounts
- `MediaUploader` - For uploading media to posts

## Hooks

Hooks for social media:

- `useSocialAccounts` - Access and manage social media accounts
- `usePosts` - Create, read, update, delete posts
- `useHashtags` - Search and manage hashtags

## Services

Services for interacting with social media platforms:

- `FacebookPublisher` - Service for publishing to Facebook
- `InstagramPublisher` - Service for publishing to Instagram
- `TwitterPublisher` - Service for publishing to Twitter
- `LinkedinPublisher` - Service for publishing to LinkedIn

## Utils

Social media utility functions:

- Content formatters for different platforms
- Character counter and limits
- Media optimization
- Hashtag management

## API

API routes for social media:

- Post creation and scheduling
- Social account management
- Media upload
- Analytics fetching

## Usage

Example of using social media components:

```tsx
import { HashtagSearch } from "~/features/social/components/HashtagSearch";
import { PostPreview } from "~/features/social/components/PostPreview";
import { usePosts } from "~/features/social/hooks/usePosts";
import { useState } from "react";

export default function CreatePostPage() {
  const [content, setContent] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const { createPost, isLoading } = usePosts();

  const handleHashtagSelect = (hashtag) => {
    setSelectedHashtags((prev) => [...prev, hashtag]);
    setContent((prev) => `${prev} #${hashtag}`);
  };

  const handleSubmit = () => {
    createPost({
      content,
      hashtags: selectedHashtags,
      scheduledAt: new Date(),
      platforms: ["facebook", "instagram"],
    });
  };

  return (
    <div className="create-post-page">
      <h1>Create Post</h1>

      <div className="post-editor">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to share?"
        />

        <HashtagSearch onSelect={handleHashtagSelect} />

        <div className="preview-section">
          <h2>Preview</h2>
          <PostPreview content={content} />
        </div>

        <button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Post"}
        </button>
      </div>
    </div>
  );
}
```
