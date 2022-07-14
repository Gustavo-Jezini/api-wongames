'use strict';

/**
 *  game controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::game.game', ({strapi}) => ({

  // Popular nossa API
  async populate(ctx) {
    console.log("Starting to populate...");

    await strapi.service('api::game.game').populate()

    ctx.send("Finished populating")
  },
 }));
