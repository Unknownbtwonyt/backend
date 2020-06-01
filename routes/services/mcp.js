const express = require("express")
const crypto = require("crypto")
const app = express.Router()


const checkToken = require(`${__dirname}/../../middleware/checkToken`)
const CommonCore = require(`${__dirname}/../../model/CommonCore`)
const profiles = require(`${__dirname}/../../structs/profiles`)
const Athena = require(`${__dirname}/../../model/Athena`)
const errors = require(`${__dirname}/../../structs/errors`)

function createResponse(changes, id, rvn) {
    return {
        profileRevision: rvn ? (rvn - 0) + (1 - 0) : 1,
        profileId: id,
        profileChangesBaseRevision: Number(rvn) || 1,
        profileChanges: changes,
        profileCommandRevision: rvn ? (rvn - 0) + (1 - 0) : 1,
        serverTime: new Date(),
        responseVersion: 1
    }
}

//query profile
app.all(`/api/game/v2/profile/:accountId/client/QueryProfile`, checkToken, async (req, res) => {
    if(req.method != "POST") return res.status(405).json(errors.method("fortnite", "prod-live"))

    if(!res.locals.jwt.checkPermission(`fortnite:profile:${req.params.accountId}:commands`, "ALL")) 
        return res.status(403).json(errors.permission(`fortnite:profile:${req.params.accountId}:commands`, "ALL", "fortnite", "prod-live"))

    switch (req.query.profileId) {
        case "athena":
            var profile = await profiles.athena(req.params.accountId)
            res.json(createResponse([profile], "athena"));
            break;
        case "creative":
            res.json(createResponse([], "creative"));
            break;
        case "common_core":
            var profile = await profiles.commoncore(req.params.accountId)
            res.json(createResponse([profile], "common_core"));
            break;
        case "common_public":
            res.json(createResponse([], "common_public"));
            break;
        default:
            res.status(400).json(errors.create(
                "errors.com.epicgames.modules.profiles.operation_forbidden", 12813, // Code
                `Unable to find template configuration for profile ${req.query.profileId}`, // Message
                "fortnite", "prod-live", // Service & Intent
                [req.query.profileId] // Variables
            ))      
            break;
    }
})

app.all(`/api/game/v2/profile/:accountId/client/ClientQuestLogin`, checkToken, async (req, res) => {
    if(req.method != "POST") return res.status(405).json(errors.method("fortnite", "prod-live"))
    if(!res.locals.jwt.checkPermission(`fortnite:profile:${req.params.accountId}:commands`, "ALL")) 
        return res.status(403).json(errors.permission(`fortnite:profile:${req.params.accountId}:commands`, "ALL", "fortnite", "prod-live"))

    switch (req.query.profileId) {
        case "athena":
            var profile = await profiles.athena(req.params.accountId)
            res.json(createResponse([profile], "athena"));
            break;
        case "creative":
            res.json(createResponse([], "creative"));
            break;
        case "common_core":
            var profile = await profiles.commoncore(req.params.accountId)
            res.json(createResponse([profile], "common_core"));
            break;
        case "common_public":
            res.json(createResponse([], "common_public"));
            break;
        default:
            res.status(400).json(errors.create(
                "errors.com.epicgames.modules.profiles.operation_forbidden", 12813, // Code
                `Unable to find template configuration for profile ${req.query.profileId}`, // Message
                "fortnite", "prod-live", // Service & Intent
                [req.query.profileId] // Variables
            ))      
            break;
    }
})

app.post("/api/game/v2/profile/:accountId/client/SetMtxPlatform", (req, res) => {
    if(req.method != "POST") return res.status(405).json(errors.method("fortnite", "prod-live"))
    if(!res.locals.jwt.checkPermission(`fortnite:profile:${req.params.accountId}:commands`, "ALL")) 
        return res.status(403).json(errors.permission(`fortnite:profile:${req.params.accountId}:commands`, "ALL", "fortnite", "prod-live"))

    res.json(createResponse([
        {
            changeType: "statModified",
            name: "current_mtx_platform",
            value: req.body.platform
        }
    ], "common_core", req.query.rvn))
})

app.post("/api/game/v2/profile/:accountId/client/SetCosmeticLockerSlot", checkToken, async (req, res) => {
    if(req.method != "POST") return res.status(405).json(errors.method("fortnite", "prod-live"))

    if(!res.locals.jwt.checkPermission(`fortnite:profile:${req.params.accountId}:commands`, "ALL")) 
        return res.status(403).json(errors.permission(`fortnite:profile:${req.params.accountId}:commands`, "ALL", "fortnite", "prod-live"))

    var bIsValid = req.body.category && req.body.itemToSlot ? true : req.body.itemToSlot == "" ? true : false && req.body.slotIndex ? true : req.body.slotIndex == 0 ? true : false && req.body.lockerItem
    
    if (!bIsValid) return res.status(400).json(errors.create(
        "errors.com.epicgames.validation.validation_failed", 1040,
        `Validation Failed. Invalid fields were [${[
            req.body.category ? null : "category",
            req.body.itemToSlot ? null : req.body.itemToSlot == "" ? null : "itemToSlot",
            req.body.lockerItem ? null : "lockerItem",
            req.body.slotIndex ? null : req.body.slotIndex == 0 ? null : "slotIndex",
        ].filter(x => x != null).join(", ")}]`,
        "fortnite", "prod-live", [`[${[
            req.body.category ? null : "category",
            req.body.itemToSlot ? null : req.body.itemToSlot == "" ? null : "itemToSlot",
            req.body.lockerItem ? null : "lockerItem",
            req.body.slotIndex ? null : req.body.slotIndex == 0 ? null : "slotIndex",
        ].filter(x => x != null).join(", ")}]`]
        
    ))

    var fields = [
        "Backpack", 
        "VictoryPose", 
        "LoadingScreen", 
        "Character", 
        "Glider", 
        "Dance", 
        "CallingCard", 
        "ConsumableEmote", 
        "MapMarker", 
        "Charm", 
        "SkyDiveContrail", 
        "Hat", 
        "PetSkin", 
        "ItemWrap", 
        "MusicPack", 
        "BattleBus", 
        "Pickaxe", 
        "VehicleDecoration"
    ]

    if (!fields.includes(req.body.category)) return res.status(400).json(errors.create(
        "errors.com.epicgames.modules.profiles.invalid_payload", 12806,
        `Unable to parse command com.epicgames.fortnite.core.game.commands.cosmetics.SetCosmeticLockerSlot. Value not one of declared Enum instance names: [${fields.join(", ")}]`,
        "fortnite", "prod-live", [
            `Unable to parse command com.epicgames.fortnite.core.game.commands.cosmetics.SetCosmeticLockerSlot. Value not one of declared Enum instance names: [${fields.join(", ")}]`,
        ]
    ))

    switch (req.body.category) {
        case "Dance":
        case "ItemWrap":
            if (req.body.slotIndex == -1) {
                var list = []
                var num = req.body.category == "Dance" ? 6 : 7

                for (var i = 0; i < num; i++) {list.push(`${req.body.itemToSlot.split(":")[0]}:${req.body.itemToSlot.split(":")[1].toLowerCase()}`)}

                await Athena.updateOne({id: req.params.accountId}, {[req.body.category.toLowerCase()]: list})
            } else {
                await Athena.updateOne({id: req.params.accountId}, {$set: {[`${req.body.category.toLowerCase()}.${req.body.slotIndex}`]: `${req.body.itemToSlot.split(":")[0]}:${req.body.itemToSlot.split(":")[1].toLowerCase()}`}})
            }
            break;
        default:
            await Athena.updateOne({id: req.params.accountId}, {[req.body.category.toLowerCase()]: `${req.body.itemToSlot.split(":")[0]}:${req.body.itemToSlot.split(":")[1].toLowerCase()}`})
            break;
    }

    if (req.body.variantUpdates.length != 0) {
        await Athena.updateOne({id: req.params.accountId}, {[`${req.body.category.toLowerCase()}variants`]: req.body.variantUpdates})
    }

    var athena = await Athena.findOne({id: req.params.accountId})

    res.json(createResponse([
        {
            changeType: "itemAttrChanged",
            itemId: req.body.lockerItem,
            attributeName: "locker_slots_data",
            attributeValue: {
                slots:  {
                    Glider: {
                        items: [
                            athena.glider
                        ]
                    },
                    Dance: {
                        items: athena.dance,
                    },
                    SkyDiveContrail: {
                        items: [
                            athena.skydivecontrail,
                        ]
                    },
                    LoadingScreen: {
                        items: [
                            athena.loadingscreen,
                        ]
                    },
                    Pickaxe: {
                        items: [
                            athena.pickaxe,
                        ]
                    },
                    ItemWrap: {
                        items: athena.itemwrap,
                    },
                    MusicPack: {
                        items: [
                            athena.musicpack
                        ]
                    },
                    Character: {
                        items: [
                            athena.character
                        ],
                        activeVariants: [
                            athena.charactervariants.length != 0 ? 
                            {
                                variants: athena.charactervariants
                            } : null
                        ]
                    },
                    Backpack: {
                        items: [
                            athena.backpack
                        ],
                        activeVariants: [
                            athena.backpackvariants.length != 0 ? 
                            {
                                variants: athena.backpackvariants
                            } : null
                        ]
                    }
                }
            }
        }
    ], "athena", req.query.rvn))
})

app.post("/api/game/v2/profile/:accountId/client/SetCosmeticLockerBanner", checkToken, async (req, res) => {
    if(req.method != "POST") return res.status(405).json(errors.method("fortnite", "prod-live"))

    if(!res.locals.jwt.checkPermission(`fortnite:profile:${req.params.accountId}:commands`, "ALL")) 
        return res.status(403).json(errors.permission(`fortnite:profile:${req.params.accountId}:commands`, "ALL", "fortnite", "prod-live"))

    var bIsValid = req.body.lockerItem && req.body.bannerColorTemplateName && req.body.bannerIconTemplateName

    if (!bIsValid) return res.status(400).json(errors.create(
        "errors.com.epicgames.validation.validation_failed", 1040,
        `Validation Failed. Invalid fields were [${[
            req.body.lockerItem ? null : "lockerItem",
            req.body.bannerColorTemplateName ? null : "bannerColorTemplateName",
            req.body.bannerIconTemplateName ? null : "bannerIconTemplateName",
        ].filter(x => x != null).join(", ")}]`,
        "fortnite", "prod-live", [`[${[
            req.body.lockerItem ? null : "lockerItem",
            req.body.bannerColorTemplateName ? null : "bannerColorTemplateName",
            req.body.bannerIconTemplateName ? null : "bannerIconTemplateName",
        ].filter(x => x != null).join(", ")}]`]
    ))

    await Athena.updateOne({id: req.params.accountId}, {bannercolor: req.body.bannerColorTemplateName, banner: req.body.bannerIconTemplateName})

    res.json(createResponse([
        {
            changeType: "itemAttrChanged",
            itemId: req.body.lockerItem,
            attributeName: "banner_icon_template",
            attributeValue: req.body.bannerIconTemplateName
        },
        {
            changeType: "itemAttrChanged",
            itemId: req.body.lockerItem,
            attributeName: "banner_color_template",
            attributeValue: req.body.bannerColorTemplateName
        }
    ], "athena", req.query.rvn))
})

module.exports = app