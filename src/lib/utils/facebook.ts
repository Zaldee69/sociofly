import { FacebookAdsApi, Page } from 'facebook-nodejs-business-sdk';

export async function postToFacebook(
  pageId: string,
  accessToken: string,
  content: string,
  mediaUrl?: string
) {
  FacebookAdsApi.init(accessToken);
  const page = new Page(pageId);

  if (mediaUrl) {
    // Post dengan gambar/video
    return page.createPhoto([], {
      caption: content,
      url: mediaUrl,
      published: true,
    });
  } else {
    // Post teks saja
    return page.createFeed([], {
      message: content,
      published: true,
    });
  }
}