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
    console.log("Item: ", results);
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

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::game.game', ({ strapi }) => ({
  // Method 1: Creating an entirely custom action
  // Popular nossa API
  async populate(ctx) {
    const gogApiUrl = "https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity"
    const { data: { products }} = await axios.get(gogApiUrl);

    // console.log(products[0]);

    await create(products[1].publisher, "publisher");
    await create(products[1].developer, "developer");

    // console.log(await getGameInfo(products[0].slug));
  },
 }));
