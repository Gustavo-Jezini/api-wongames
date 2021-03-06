'use strict';

/**
 * game service.
 */

const axios = require("axios");
const slugify = require("slugify");


async function getGameInfo(slug) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;
  const body = await axios.get(`https://www.gog.com/game/${slug}`);
  const dom = new JSDOM(body.data);

  const description = dom.window.document.querySelector(".description");

  return {
    rating: 'BR0',
    short_description: description.textContent.slice(0, 160),
    description: description.innerHTML
  }
}

async function getByName(name, entityName) {
  const { results } = await strapi
  .service(`api::${entityName}.${entityName}`)
    .find({
      filters: {
        name: { $eq: name}
      }
    });
  return results.length ? results[0] : null;
}

async function create(name, entityName) {
  const item = await getByName(name, entityName);

  if (!item) {
    return await strapi.service(`api::${entityName}.${entityName}`)
    .create({
      data: {
        name: name ,
        slug: slugify( name , { lower: true })
        }
    })
  }
}

async function createManyToManyData(products) {
  const developers = {};
  const publishers = {};
  const categories = {};
  const platforms = {};

  products.forEach((product) => {
    const { developer, publisher, genres, supportedOperatingSystems } = product;

    genres &&
      genres.forEach((item) => {
        categories[item] = true;
      });
    supportedOperatingSystems &&
      supportedOperatingSystems.forEach((item) => {
        platforms[item] = true;
      });
    developers[developer] = true;
    publishers[publisher] = true;
  });

  return Promise.all([
    ...Object.keys(developers).map((name) => create(name, "developer")),
    ...Object.keys(publishers).map((name) => create(name, "publisher")),
    ...Object.keys(categories).map((name) => create(name, "category")),
    ...Object.keys(platforms).map((name) => create(name, "platform")),
  ]);
}

async function createGames(products) {
  await Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, "game");

      if (!item) {
        console.info(`Creating: ${product.title}...`);

        const game = await strapi.service('api::game.game').create(
          { data: {
          name: product.title,
          slug: product.slug.replace(/_/g, "-"),
          price: product.price.amount,
          release_date: new Date(
            Number(product.globalReleaseDate) * 1000
          ).toISOString(),
          categories: await Promise.all(
            product.genres.map((name) => getByName(name, "category"))
          ),
          platforms: await Promise.all(
            product.supportedOperatingSystems.map((name) =>
              getByName(name, "platform")
            )
          ),
          developers: [await getByName(product.developer, "developer")],
          publisher: await getByName(product.publisher, "publisher"),
          ...(await getGameInfo(product.slug)),
        }
      });

        return game;
      }
    })
  );
}

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::game.game', ({ strapi }) => ({
  // Method 1: Creating an entirely custom action
  // Popular nossa API
  async populate(ctx) {
    const gogApiUrl = "https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity"
    const { data: { products }} = await axios.get(gogApiUrl);

    // console.log(products[0]);

    await createManyToManyData([products[2], products[3]])
    await createGames([products[2], products[3]])

    // await create(products[1].publisher, "publisher");
    // await create(products[1].developer, "developer");

    // console.log(await getGameInfo(products[0].slug));
  },
 }));
