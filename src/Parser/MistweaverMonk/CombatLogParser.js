import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';
// import Icon from 'common/Icon';
import ITEMS from 'common/ITEMS';
import ItemLink from 'common/ItemLink';
import ItemIcon from 'common/ItemIcon';

import StatisticBox from 'Main/StatisticBox';
import SuggestionsTab from 'Main/SuggestionsTab';
import TalentsTab from 'Main/TalentsTab';
import CastEfficiencyTab from 'Main/CastEfficiencyTab';
import CooldownsTab from 'Main/CooldownsTab';
import ManaTab from 'Main/ManaTab';

import MainCombatLogParser from 'Parser/Core/CombatLogParser';
import ParseResults from 'Parser/Core/ParseResults';
import getCastEfficiency from 'Parser/Core/getCastEfficiency';
import ISSUE_IMPORTANCE from 'Parser/Core/ISSUE_IMPORTANCE';
import AbilityTracker from 'Parser/Core/Modules/AbilityTracker';
// import DarkmoonDeckPromises from 'Parser/Core/Modules/Items/DarkmoonDeckPromises';
// import AmalgamsSeventhSpine from 'Parser/Core/Modules/Items/AmalgamsSeventhSpine';
import Prydaz from 'Parser/Core/Modules/Items/Prydaz';

// Features
import CooldownTracker from './Modules/Features/CooldownTracker';
import AlwaysBeCasting from './Modules/Features/AlwaysBeCasting';
import UpliftingTrance from './Modules/Features/UpliftingTrance';
import ManaTea from './Modules/Features/ManaTea';
import ManaSavingTalents from './Modules/Features/ManaSavingTalents';
import ThunderFocusTea from './Modules/Features/ThunderFocusTea';
import SheilunsGift from './Modules/Features/SheilunsGift';
import RenewingMist from './Modules/Features/RenewingMist';
import AOEHealingTracker from './Modules/Features/AOEHealingTracker';
import EssenceFontMastery from './Modules/Features/EssenceFontMastery';
import ChiJi from './Modules/Features/ChiJi';
import ChiBurst from './Modules/Features/ChiBurst';

// Setup for Items
import Velens from './Modules/Items/Velens';
import DrapeOfShame from './Modules/Items/DrapeOfShame';
import Eithas from './Modules/Items/Eithas';

import CPM_ABILITIES, { SPELL_CATEGORY } from './CPM_ABILITIES';

function formatThousands(number) {
  return (Math.round(number || 0) + '').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}
function formatNumber(number) {
  if (number > 1000000) {
    return `${(number / 1000000).toFixed(2)}m`;
  }
  if (number > 10000) {
    return `${Math.round(number / 1000)}k`;
  }
  return formatThousands(number);
}

function getIssueImportance(value, regular, major, higherIsWorse = false) {
  if (higherIsWorse ? value > major : value < major) {
    return ISSUE_IMPORTANCE.MAJOR;
  }
  if (higherIsWorse ? value > regular : value < regular) {
    return ISSUE_IMPORTANCE.REGULAR;
  }
  return ISSUE_IMPORTANCE.MINOR;
}
function formatPercentage(percentage) {
  return (Math.round((percentage || 0) * 10000) / 100).toFixed(2);
}
function getRawHealing(ability) {
  return ability.healingEffective + ability.healingAbsorbed + ability.healingOverheal;
}
function getOverhealingPercentage(ability) {
  return ability.healingOverheal / getRawHealing(ability);
}

class CombatLogParser extends MainCombatLogParser {
  static specModules = {
    // Override the ability tracker so we also get stats for IoL and beacon healing
    abilityTracker: AbilityTracker,

    // Features
    alwaysBeCasting: AlwaysBeCasting,
    cooldownTracker: CooldownTracker,
    upliftingTrance: UpliftingTrance,
    manaTea: ManaTea,
    manaSavingTalents: ManaSavingTalents,
    thunderFocusTea: ThunderFocusTea,
    sheilunsGift: SheilunsGift,
    renewingMist: RenewingMist,
    aoeHealingTracker: AOEHealingTracker,
    essenceFontMastery: EssenceFontMastery,
    chiJi: ChiJi,
    chiBurst: ChiBurst,


    // Legendaries / Items:
    drapeOfShame: DrapeOfShame,
    prydaz: Prydaz,
    // sephuz: Sephuz,
    velens: Velens,
    eithas: Eithas,

    // Shared:
    //amalgamsSeventhSpine: AmalgamsSeventhSpine,
    //darkmoonDeckPromises: DarkmoonDeckPromises,
  };

  generateResults() {
    const results = new ParseResults();

    const fightDuration = this.fightDuration;
    const fightEndTime = this.fight.end_time;
    const raidSize = Object.entries(this.combatants.players).length;
    // const deadTimePercentage = this.modules.alwaysBeCasting.totalTimeWasted / fightDuration;

    const abilityTracker = this.modules.abilityTracker;
    const getAbility = spellId => abilityTracker.getAbility(spellId);

    const velensHealingPercentage = this.modules.velens.healing / this.totalHealing;
    const prydazHealingPercentage = this.modules.prydaz.healing / this.totalHealing;
    const drapeOfShameHealingPercentage = this.modules.drapeOfShame.healing / this.totalHealing;
    const eithasHealingPercentage = this.modules.eithas.healing / this.totalHealing;

    const unusedUTProcs = 1 - (this.modules.upliftingTrance.consumedUTProc / this.modules.upliftingTrance.UTProcsTotal);

    const avgSGOverheal = this.modules.sheilunsGift.overhealSG / this.modules.sheilunsGift.castsSG || 0;
    const SGability = getAbility(SPELLS.SHEILUNS_GIFT.id);
    const SGcasts = SGability.casts || 0;
    const avgSGstacks = this.modules.sheilunsGift.stacksTotalSG / SGcasts || 0;
    const wastedSGStacks = this.modules.sheilunsGift.stacksWastedSG + Math.floor((fightEndTime - this.modules.sheilunsGift.lastSGStack) / 10000);
    const missedWhispersHeal = ((Math.floor(fightDuration / 10000) + this.modules.sheilunsGift.countEff) - this.modules.sheilunsGift.countWhispersHeal);

    const manaTea = getAbility(SPELLS.MANA_TEA_TALENT.id);
    const mtCasts = manaTea.casts || 0;
    const avgMTsaves = this.modules.manaTea.manaSavedMT / mtCasts || 0;

    const chiBurstHealing = this.modules.chiBurst.healingChiBurst + this.modules.chiBurst.absorbedHealingChiBurst || 0;
    const avgChiBurstTargets = this.modules.chiBurst.targetsChiBurst / this.modules.chiBurst.castChiBurst || 0;

    const avgCelestialBreathHealing = this.modules.aoeHealingTracker.healingCelestialBreath / this.modules.aoeHealingTracker.healsCelestialBreath || 0;
    const avgCelestialBreathTargets = this.modules.aoeHealingTracker.healsCelestialBreath / this.modules.aoeHealingTracker.procsCelestialBreath || 0;
    const avgMistsOfSheilunHealing = this.modules.aoeHealingTracker.healingMistsOfSheilun / this.modules.aoeHealingTracker.healsMistsOfSheilun || 0;
    const avgMistsOfSheilunTargets = this.modules.aoeHealingTracker.healsMistsOfSheilun / this.modules.aoeHealingTracker.procsMistsOfSheilun || 0;
    const avgRJWHealing = this.modules.aoeHealingTracker.healingRJW / this.modules.aoeHealingTracker.castRJW || 0;
    const avgRJWTargets = this.modules.aoeHealingTracker.healsRJW / this.modules.aoeHealingTracker.castRJW || 0;

    const efMasteryCasts = (this.modules.essenceFontMastery.healEF / 2) || 0;
    const efMasteryEffectiveHealing = ((this.modules.essenceFontMastery.healingEF + this.modules.essenceFontMastery.absorbedhealingEF) / 2) || 0;
    const avgEFMasteryHealing = efMasteryEffectiveHealing / efMasteryCasts || 0;

    const avgMasteryCastsPerEF = (this.modules.essenceFontMastery.castEF / efMasteryCasts) || 0;
    const avgTargetsHitPerEF = (this.modules.essenceFontMastery.targetsEF / this.modules.essenceFontMastery.castEF) || 0;

    // Trait Checks
    const hasWhispersOfShaohao = this.selectedCombatant.traitsBySpellId[SPELLS.WHISPERS_OF_SHAOHAO_TRAIT.id] === 1;
    const hasCelestialBreath = this.selectedCombatant.traitsBySpellId[SPELLS.CELESTIAL_BREATH_TRAIT.id] === 1;
    const hasMistsOfSheilun = this.selectedCombatant.traitsBySpellId[SPELLS.MISTS_OF_SHEILUN_TRAIT.id] === 1;

    const hasRJW = this.selectedCombatant.hasTalent(SPELLS.REFRESHING_JADE_WIND_TALENT.id);
    const hasSotC = this.selectedCombatant.hasTalent(SPELLS.SPIRIT_OF_THE_CRANE_TALENT.id);
    const hasLifecycles = this.selectedCombatant.hasTalent(SPELLS.LIFECYCLES_TALENT.id);

    const sheilunsGiftHealing = getAbility(SPELLS.SHEILUNS_GIFT.id);
    const sheilunsGiftOverhealingPercentage = getOverhealingPercentage(sheilunsGiftHealing) || 0;

    /*
    if (deadTimePercentage > 0.2) {
      results.addIssue({
        issue: `Your dead GCD time can be improved. Try to Always Be Casting (ABC); when there's nothing to heal try to contribute some damage (${Math.round(deadTimePercentage * 100)}% dead GCD time).`,
        icon: 'spell_mage_altertime',
        importance: getIssueImportance(deadTimePercentage, 0.35, 0.4, true),
      });
    }
    */
    // Missed Whispers healing
    if(hasWhispersOfShaohao && missedWhispersHeal > 10) {
      results.addIssue({
        issue: <span>You missed {missedWhispersHeal} <SpellLink id={SPELLS.WHISPERS_OF_SHAOHAO.id} /> healing procs.  While you cannot actively place the clouds that spawn, work to position yourself near other members of the raid so that when the clouds are used, they heal someone.</span>,
        icon: SPELLS.WHISPERS_OF_SHAOHAO_TRAIT.icon,
        importance: getIssueImportance(missedWhispersHeal, 12, 15, true),
      });
    }
    // Sheilun's Gift Overhealing issue
    if(sheilunsGiftOverhealingPercentage > .5 && avgSGstacks >= 6) {
      results.addIssue({
        issue: <span>You averaged {(avgSGOverheal / 1000).toFixed(0)}k overheal with your <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> and casted with an average of {(avgSGstacks).toFixed(0)} stacks.  Consider using <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> at lower stacks to increase effectiveness.</span>,
        icon: SPELLS.SHEILUNS_GIFT.icon,
        importance: getIssueImportance(sheilunsGiftOverhealingPercentage, .6, .8, true),
      });
    }
    if(sheilunsGiftOverhealingPercentage > .5 && avgSGstacks < 6) {
      results.addIssue({
        issue: <span>You averaged {(avgSGOverheal / 1000).toFixed(0)}k overheal with your <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> and casted with an average of {(avgSGstacks).toFixed(0)} stacks.  Consider using <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> on injured targets to increase effectiveness.</span>,
        icon: SPELLS.SHEILUNS_GIFT.icon,
        importance: getIssueImportance(sheilunsGiftOverhealingPercentage, .6, .8, true),
      });
    }
    // Sheilun's Gift Casts
    if(SGcasts < ((this.fightDuration / 10000) / 5)) {
      results.addIssue({
        issue: <span>You casted <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> {SGcasts} times over the course of the fight.  Casting at an average of 5 stacks would have given you potentially {(((this.fightDuration / 10000) / 5)).toFixed(1)} casts.  Consider using <SpellLink id={SPELLS.SHEILUNS_GIFT.id} /> more often to take advantage of its free healing.</span>,
        icon: SPELLS.SHEILUNS_GIFT.icon,
        importance: getIssueImportance(SGcasts, ((this.fightDuration / 10000) / 8), ((this.fightDuration / 10000) / 12)),
      });
    }

    if (this.modules.velens.active && velensHealingPercentage < 0.045) {
      results.addIssue({
        issue: <span>Your usage of <ItemLink id={ITEMS.VELENS_FUTURE_SIGHT.id} /> can be improved. Try to maximize the amount of casts during the buff or consider using an easier legendary ({(velensHealingPercentage * 100).toFixed(2)}% healing contributed).</span>,
        icon: ITEMS.VELENS_FUTURE_SIGHT.icon,
        importance: getIssueImportance(velensHealingPercentage, 0.04, 0.03),
      });
    }
    // Uplifting Trance Usage
    if (unusedUTProcs > 0.10) {
      results.addIssue({
        issue: <span>Your <SpellLink id={SPELLS.UPLIFTING_TRANCE_BUFF.id} /> procs should be used as soon as you get them so they are not overwritten. You missed {(this.modules.upliftingTrance.UTProcsTotal - this.modules.upliftingTrance.consumedUTProc)}/{(this.modules.upliftingTrance.UTProcsTotal)} procs. ({formatPercentage((this.modules.upliftingTrance.UTProcsTotal - this.modules.upliftingTrance.consumedUTProc) / this.modules.upliftingTrance.UTProcsTotal)} %)</span>,
        icon: SPELLS.UPLIFTING_TRANCE_BUFF.icon,
        importance: getIssueImportance(unusedUTProcs, 0.2, 0.5, true),
      });
    }
    /* Removed per feedback from Garg on 6/24
    // Non-UT Buffed Vivify
    const vivify = this.modules.upliftingTrance.consumedUTProc + this.modules.upliftingTrance.nonUTVivify;
    const nonUTVivify = this.modules.upliftingTrance.nonUTVivify;
    if (nonUTVivify / vivify > 0) {
      results.addIssue({
        issue: <span><a href="http://www.wowhead.com/spell=116670" target="_blank" rel="noopener noreferrer">Vivify</a> is an inefficient spell to cast without <a href="http://www.wowhead.com/spell=197206" target="_blank" rel="noopener noreferrer">Uplifting Trance</a> procs.  You casted {nonUTVivify} Vivify's without the Uplifting Trance procc and {this.modules.upliftingTrance.tftVivCast} Vivfy's with the Thunder Focus Tea buff.</span>,
        icon: SPELLS.VIVIFY.icon,
        importance: getIssueImportance(nonUTVivify / vivify, 0.5, 0.25, true),
      });
    }*/
    // Mana Tea Usage issue
    if (this.modules.manaTea.active && avgMTsaves < 200000) {
      results.addIssue({
        issue: <span>Your mana spent during <SpellLink id={SPELLS.MANA_TEA_TALENT.id} /> can be improved. Always aim to cast your highest mana spells such as <SpellLink id={SPELLS.ESSENCE_FONT.id} /> or <SpellLink id={SPELLS.VIVIFY.id} />. ({((this.modules.manaTea.manaSaved / this.modules.manaTea.manateaCount) / 1000).toFixed(0)}k avg mana saved)</span>,
        icon: SPELLS.MANA_TEA_TALENT.icon,
        importance: getIssueImportance(avgMTsaves, 160000, 120000),
      });
    }
    // Lifecycles Manasavings
    if(hasLifecycles && this.modules.manaSavingTalents.manaSaved < 200000) {
      results.addIssue({
        issue: <span>Your current spell usage is not taking full advantage of the <SpellLink id={SPELLS.LIFECYCLES_TALENT.id} />  talent.  You casted {this.modules.manaSavingTalents.castsNonRedViv} / {(this.modules.manaSavingTalents.castsRedViv + this.modules.manaSavingTalents.castsNonRedViv)} Vivfy's and {this.modules.manaSavingTalents.castsNonRedEnm} / {(this.modules.manaSavingTalents.castsRedEnm + this.modules.manaSavingTalents.castsNonRedEnm)} Enveloping Mists without the mana saving buffs provided by <a href="http://www.wowhead.com/spell=197915" target="_blank" rel="noopener noreferrer">Lifecycles</a></span>,
        icon:SPELLS.LIFECYCLES_TALENT.icon,
        importance: getIssueImportance(this.modules.manaSavingTalents.manaSaved, 170000, 140000),
      });
    }
    // Incorrect TFT Usage
    if(this.modules.thunderFocusTea.castsUnderTft - (this.modules.thunderFocusTea.castsTftEf + this.modules.thunderFocusTea.castsTftViv) > 1) {
      results.addIssue({
        issue: <span>You are currently using <SpellLink id={SPELLS.THUNDER_FOCUS_TEA.id} /> to buff spells other than <SpellLink id={SPELLS.VIVIFY.id} /> or <SpellLink id={SPELLS.ESSENCE_FONT.id} />.  You used the TFT buff on {(this.modules.thunderFocusTea.castsUnderTft - (this.modules.thunderFocusTea.castsTftEf + this.modules.thunderFocusTea.castsTftViv))} spells other than Essence Font, or Vivify.</span>,
        icon: SPELLS.THUNDER_FOCUS_TEA.icon,
        importance: getIssueImportance(this.modules.thunderFocusTea.castsUnderTft - (this.modules.thunderFocusTea.castsTftEf + this.modules.thunderFocusTea.castsTftViv), 2, 4, true),
      });
    }
    // EF Mastery Proc Usage
    if (avgMasteryCastsPerEF < 3 && avgTargetsHitPerEF > 0) {
      results.addIssue({
        issue: <span>You are currently not utilizing your <SpellLink id={SPELLS.ESSENCE_FONT.id} /> HOT buffs effectively.  You only utilized an average of {avgMasteryCastsPerEF.toFixed(2)} HOTs over {this.modules.essenceFontMastery.castEF} <SpellLink id={SPELLS.ESSENCE_FONT.id} /> casts.</span>,
        icon: SPELLS.GUSTS_OF_MISTS.icon,
        importance: getIssueImportance(avgMasteryCastsPerEF, 2, 1),
      });
    }
    // EF Targets Hit
    if(avgTargetsHitPerEF < 17) {
      results.addIssue({
        issue: <span>You are currently using not utilizing your <SpellLink id={SPELLS.ESSENCE_FONT.id} /> effectively.  You only hit an average of {(avgTargetsHitPerEF).toFixed(0)} targets over {this.modules.essenceFontMastery.castEF} <SpellLink id={SPELLS.ESSENCE_FONT.id} /> casts.  Each <SpellLink id={SPELLS.ESSENCE_FONT.id} /> cast should hit a total of 18 targets.  Your missed an average of {(18 - avgTargetsHitPerEF).toFixed(0)} targets.</span>,
        icon: SPELLS.ESSENCE_FONT.icon,
        importance: getIssueImportance(avgTargetsHitPerEF, 14, 12),
      });
    }
    // SotC Usage
    if (hasSotC && this.modules.manaSavingTalents.manaReturnSotc < 300000) {
      results.addIssue({
        issue: <span>You are not utilizing your <SpellLink id={SPELLS.SPIRIT_OF_THE_CRANE_TALENT.id} /> talent as effectively as you could.  You only received {(this.modules.manaSavingTalents.manaReturnSotc / 1000).toFixed(0)}k mana back during this fight.  You also lost {(this.modules.manaSavingTalents.totmOverCap + this.modules.manaSavingTalents.totmBuffWasted)} Teachings of the Monestery stacks</span>,
        icon: SPELLS.SPIRIT_OF_THE_CRANE_TALENT.icon,
        importance: getIssueImportance(this.modules.manaSavingTalents.manaReturnSotc, 250000, 150000),
      });
    }
    // Chi Burst Usage
    if(this.modules.chiBurst.active && avgChiBurstTargets < (raidSize * .4)) {
      results.addIssue({
        issue: <span>You are not utilizing your <SpellLink id={SPELLS.CHI_BURST_TALENT.id} /> talent as effectively as you should.  You hit an average of {avgChiBurstTargets.toFixed(2)} targets per Chi Burst cast.  Look to better position yourself during your your Chi Burst casts to get the most use out of the spell.  ({((chiBurstHealing / this.modules.chiBurst.castChiBurst) / 1000).toFixed(1)}k avg healing per cast.)</span>,
        icon: SPELLS.CHI_BURST_TALENT.icon,
        importance: getIssueImportance(avgChiBurstTargets, (raidSize * .3), (raidSize * .25)),
      });
    }

    const castEfficiencyCategories = SPELL_CATEGORY;
    const castEfficiency = getCastEfficiency(CPM_ABILITIES, this);
    castEfficiency.forEach((cpm) => {
      if (cpm.canBeImproved && !cpm.ability.noSuggestion) {
        results.addIssue({
          issue: <span>Try to cast <SpellLink id={cpm.ability.spell.id} /> more often ({cpm.casts}/{cpm.maxCasts} casts: {Math.round(cpm.castEfficiency * 100)}% cast efficiency). {cpm.ability.extraSuggestion || ''}</span>,
          icon: cpm.ability.spell.icon,
          importance: cpm.ability.importance || getIssueImportance(cpm.castEfficiency, cpm.recommendedCastEfficiency - 0.05, cpm.recommendedCastEfficiency - 0.15),
        });
      }
    });

    results.statistics = [
      <StatisticBox
        icon={(
          <img
            src="/img/healing.png"
            style={{ border: 0 }}
            alt="Healing"
          />
        )}
        value={`${formatNumber(this.totalHealing / this.fightDuration * 1000)} HPS`}
        label={(
          <dfn data-tip={`The total healing done recorded was ${formatThousands(this.totalHealing)}.`}>
            Healing done
          </dfn>
        )}
      />,
      /*<StatisticBox
        icon={<Icon icon="petbattle_health-down" alt="Non healing time" />}
        value={`${formatPercentage(deadTimePercentage)} %`}
        label={(
          <dfn data-tip="Dead GCD time is available casting time not used. This can be caused by latency, cast interrupting, not casting anything (e.g. due to movement/stunned), etc.">
            Dead GCD time
          </dfn>
        )}
      />,*/
      // Thunder Focus Tea Usage
      <StatisticBox
        icon={<SpellIcon id={SPELLS.THUNDER_FOCUS_TEA.id} />}
        value={`${this.modules.thunderFocusTea.castsTft}`}
        label={(
          <dfn data-tip={`With your ${this.modules.thunderFocusTea.castsTft} Thunder Focus Tea casts, you buffed the following spells:
            <ul>
              ${this.modules.thunderFocusTea.castsTftViv > 0 ?
              `<li>${(this.modules.thunderFocusTea.castsTftViv)} Vivify buffed (${formatPercentage(this.modules.thunderFocusTea.castsTftViv / this.modules.thunderFocusTea.castsTft)}%)</li>`
              : ""
              }
              ${this.modules.thunderFocusTea.castsTftRem > 0 ?
              `<li>${(this.modules.thunderFocusTea.castsTftRem)} Renewing Mist buffed (${formatPercentage(this.modules.thunderFocusTea.castsTftRem / this.modules.thunderFocusTea.castsTft)}%)</li>`
              : ""
              }
              ${this.modules.thunderFocusTea.castsTftEnm > 0 ?
              `<li>${(this.modules.thunderFocusTea.castsTftEnm)} Enveloping Mists buffed (${formatPercentage(this.modules.thunderFocusTea.castsTftEnm / this.modules.thunderFocusTea.castsTft)}%)</li>`
              : ""
              }
              ${this.modules.thunderFocusTea.castsTftEff > 0 ?
              `<li>${(this.modules.thunderFocusTea.castsTftEff)} Effuse buffed (${formatPercentage(this.modules.thunderFocusTea.castsTftEff / this.modules.thunderFocusTea.castsTft)}%)</li>`
              : ""
              }
              ${this.modules.thunderFocusTea.castsTftEf > 0 ?
              `<li>${(this.modules.thunderFocusTea.castsTftEf)} Essence Font buffed (${formatPercentage(this.modules.thunderFocusTea.castsTftEf / this.modules.thunderFocusTea.castsTft)}%)</li>`
              : ""
              }
            </ul>
            `}>
            Total casts
          </dfn>
        )}
      />,
      // UT Proc Usage
      <StatisticBox
        icon={<SpellIcon id={SPELLS.UPLIFTING_TRANCE_BUFF.id} />}
        value={`${formatPercentage(unusedUTProcs)}%`}
        label={(
          <dfn data-tip={`You got total <b>${this.modules.upliftingTrance.UTProcsTotal} uplifting trance procs</b> and <b>used ${this.modules.upliftingTrance.consumedUTProc}</b> of them. ${this.modules.upliftingTrance.nonUTVivify} of your vivify's were used without an uplifting trance procs.`}>
            Unused Procs
          </dfn>
        )}
      />,
      // Mana Tea Usage
      this.modules.manaTea.active && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.MANA_TEA_TALENT.id} />}
          value={`${formatNumber(avgMTsaves)}`}
          label={(
            <dfn
              data-tip={`
                  During your ${this.modules.manaTea.manateaCount} <a href="http://www.wowhead.com/spell=197908" target="_blank" rel="noopener noreferrer">Mana Teas</a> saved the following mana:
                  <ul>
                  ${this.modules.manaTea.efCasts > 0 ?
                  `<li>${(this.modules.manaTea.efCasts)} Essence Font casts</li>`
                  : ""
                  }
                  ${this.modules.manaTea.efCasts > 0 ?
                  `<li>${(this.modules.manaTea.vivCasts)} Vivfy casts</li>`
                  : ""
                  }
                  ${this.modules.manaTea.efCasts > 0 ?
                  `<li>${(this.modules.manaTea.enmCasts)} Enveloping Mists casts</li>`
                  : ""
                  }
                  <li>${(this.modules.manaTea.rjwCasts + this.modules.manaTea.revCasts + this.modules.manaTea.remCasts + this.modules.manaTea.lcCasts + this.modules.manaTea.effCasts)} other spells casted.</li>
                  <li>${(this.modules.manaTea.nonManaCasts)} non-mana casts during Mana Tea</li>
              </ul>`}
            >
              Average mana saved
            </dfn>
          )}
        />
      ),
    // Lifecycles Usage
      hasLifecycles && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.LIFECYCLES_TALENT.id} />}
          value={`${formatNumber(this.modules.manaSavingTalents.manaSaved)}`}
          label={(
            <dfn data-tip={`You saved a total of ${this.modules.manaSavingTalents.manaSaved} from the Lifecycles talent.
              <ul><li>On ${this.modules.manaSavingTalents.castsRedViv} Vivify casts, you saved ${(this.modules.manaSavingTalents.manaSavedViv / 1000).toFixed(0)}k mana. (${formatPercentage(this.modules.manaSavingTalents.castsRedViv / (this.modules.manaSavingTalents.castsRedViv + this.modules.manaSavingTalents.castsNonRedViv))}%)</li>
              <li>On ${this.modules.manaSavingTalents.castsRedEnm} Enveloping Mists casts, you saved ${(this.modules.manaSavingTalents.manaSavedEnm / 1000).toFixed(0)}k mana. (${formatPercentage(this.modules.manaSavingTalents.castsRedEnm / (this.modules.manaSavingTalents.castsRedEnm + this.modules.manaSavingTalents.castsNonRedEnm))}%)</li>
              <li>You casted ${this.modules.manaSavingTalents.castsNonRedViv} Vivify's and ${this.modules.manaSavingTalents.castsNonRedEnm} Enveloping Mists at full mana.</li>
              </ul>
              `}>
              Mana Saved
            </dfn>
          )}
        />
      ),
      // SotC Usage
      hasSotC && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.SPIRIT_OF_THE_CRANE_TALENT.id} />}
          value={`${formatNumber(this.modules.manaSavingTalents.manaReturnSotc)}`}
          label={(
            <dfn data-tip={`
                You gained a raw total of ${((this.modules.manaSavingTalents.manaReturnSotc + this.modules.manaSavingTalents.sotcWasted) / 1000).toFixed(0)}k mana from SotC with ${(this.modules.manaSavingTalents.sotcWasted / 1000).toFixed(0)}k wasted.<br>
                You lost ${(this.modules.manaSavingTalents.totmOverCap + this.modules.manaSavingTalents.totmBuffWasted)} Teachings of the Monestery stacks
              <ul>
                ${this.modules.manaSavingTalents.totmOverCap > 0 ?
                `<li>You overcapped Teachings ${(this.modules.manaSavingTalents.totmOverCap)} times</li>`
                : ""
                }
                ${this.modules.manaSavingTalents.totmBuffWasted > 0 ?
                `<li>You let Teachings drop off ${(this.modules.manaSavingTalents.totmBuffWasted)} times</li>`
                : ""
                }
              </ul>
              `}>
              Mana Returned
            </dfn>
          )}
        />
      ),
      // Average SG Stacks
      <StatisticBox
        icon={<SpellIcon id={SPELLS.SHEILUNS_GIFT.id} />}
        value={`${(avgSGstacks).toFixed(0)}`}
        label={(
          <dfn data-tip={`${SGcasts > 0 ? `You healed for an average of ${formatNumber(this.modules.sheilunsGift.sgHeal / this.modules.sheilunsGift.castsSG)} with each Sheilun's cast.` : ""}
            ${wastedSGStacks > 0 ? `<br>You wasted ${(wastedSGStacks)} stack(s) during this fight.` : ""}
            `}>
            Avg stacks used
          </dfn>
        )}
      />,
      // Whispers Usage
      hasWhispersOfShaohao && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.WHISPERS_OF_SHAOHAO.id} />}
          value={`${(missedWhispersHeal)}`}
          label={(
            <dfn data-tip={`You had a total of ${(this.modules.sheilunsGift.countWhispersHeal)} Whispers of Shaohao heals, but had a chance at ${(missedWhispersHeal)} additional heals.`}>
              Total Heals Missed
            </dfn>
          )}
        />
      ),

      // Celestial Breath
      hasCelestialBreath && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.CELESTIAL_BREATH_TRAIT.id} />}
          value={`${formatNumber(avgCelestialBreathHealing)}`}
          label={(
            <dfn data-tip={`You healed an average of ${avgCelestialBreathTargets.toFixed(2)} targets per Celestial Breath cast over your ${this.modules.aoeHealingTracker.procsCelestialBreath} casts.`}>
              Average Healing
            </dfn>
          )}
        />
      ),
      // Mists of Sheilun
      hasMistsOfSheilun && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.MISTS_OF_SHEILUN_TRAIT.id} />}
          value={`${formatNumber(avgMistsOfSheilunHealing)}`}
          label={(
            <dfn data-tip={`You healed an average of ${(avgMistsOfSheilunTargets).toFixed(2)} targets per Mists of Sheilun proc over your ${this.modules.aoeHealingTracker.procsMistsOfSheilun} procs.`}>
              Average Healing
            </dfn>
          )}
        />
      ),
      // Refreshing Jade Wind
      hasRJW && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.REFRESHING_JADE_WIND_TALENT.id} />}
          value={`${formatNumber(avgRJWHealing)}`}
          label={(
            <dfn data-tip={`You hit a total of ${this.modules.aoeHealingTracker.healsRJW} targets with Refreshing Jade Wind on ${this.modules.aoeHealingTracker.castRJW} casts. (${(avgRJWTargets).toFixed(1)} Average Targets Hit per Cast.)`}>
              Average Healing
            </dfn>
          )}
        />
      ),
      // Dancing Mist Tracking
      this.modules.renewingMist.active && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.DANCING_MISTS.id} />}
          value={`${formatNumber(this.modules.renewingMist.dancingMistHeal)}`}
          label={(
            <dfn data-tip={`You had a total of ${(this.modules.renewingMist.dancingMistProc)} procs on ${this.modules.renewingMist.castsREM} REM casts.`}>
              Total Healing
            </dfn>
          )}
        />
      ),

      // EF Mastery stats
      efMasteryCasts > 0 && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.GUSTS_OF_MISTS.id} />}
          value={`${efMasteryCasts}`}
          label={(
            <dfn data-tip={`You healed a total of ${efMasteryCasts} targets with the Essence Font buff for ${formatNumber(efMasteryEffectiveHealing)} healing. You also healed an average of ${avgMasteryCastsPerEF} per Essence Font cast.  (${formatNumber(avgEFMasteryHealing)} average healing per cast.)`}>
              Mastery Buffs utilized
            </dfn>
          )}
        />
      ),
      // EF Targets Hit
      <StatisticBox
        icon={<SpellIcon id={SPELLS.ESSENCE_FONT.id} />}
        value={`${(avgTargetsHitPerEF).toFixed(0)}`}
        label={(
          <dfn data-tip={`You healed an average of ${(avgTargetsHitPerEF).toFixed(2)} targets per Essence Font cast over your ${this.modules.essenceFontMastery.castEF} casts.`}>
            Average Targets hit
          </dfn>
        )}
      />,

      // Chi Burst Healing / Targets Hit
      this.modules.chiBurst.active && (
        <StatisticBox
          icon={<SpellIcon id={SPELLS.CHI_BURST_TALENT.id} />}
          value={`${formatNumber(chiBurstHealing)}`}
          label={(
            <dfn data-tip={`You healed an average of ${avgChiBurstTargets.toFixed(2)} targets per Chi Burst cast over your ${this.modules.chiBurst.castChiBurst} casts.`}>
              Total Healing
            </dfn>
          )}
        />
      ),
    ];

    results.items = [
      this.modules.velens.active && {
        id: ITEMS.VELENS_FUTURE_SIGHT.id,
        icon: <ItemIcon id={ITEMS.VELENS_FUTURE_SIGHT.id} />,
        title: <ItemLink id={ITEMS.VELENS_FUTURE_SIGHT.id} />,
        result: (
          <dfn data-tip="The actual effective healing contributed by the Velen's Future Sight use effect.">
            {((velensHealingPercentage * 100) || 0).toFixed(2)} % / {formatNumber(this.modules.velens.healing / fightDuration * 1000)} HPS
          </dfn>
        ),
      },

      this.modules.prydaz.active && {
        id: ITEMS.PRYDAZ_XAVARICS_MAGNUM_OPUS.id,
        icon: <ItemIcon id={ITEMS.PRYDAZ_XAVARICS_MAGNUM_OPUS.id} />,
        title: <ItemLink id={ITEMS.PRYDAZ_XAVARICS_MAGNUM_OPUS.id} />,
        result: (
          <dfn data-tip="The actual effective healing contributed by the Prydaz, Xavaric's Magnum Opus equip effect.">
            {((prydazHealingPercentage * 100) || 0).toFixed(2)} % / {formatNumber(this.modules.prydaz.healing / fightDuration * 1000)} HPS
          </dfn>
        ),
      },
      this.modules.drapeOfShame.active && {
        id: ITEMS.DRAPE_OF_SHAME.id,
        icon: <ItemIcon id={ITEMS.DRAPE_OF_SHAME.id} />,
        title: <ItemLink id={ITEMS.DRAPE_OF_SHAME.id} />,
        result: (
          <dfn data-tip="The actual effective healing contributed by the Drape of Shame equip effect.">
            {((drapeOfShameHealingPercentage * 100) || 0).toFixed(2)} % / {formatNumber(this.modules.drapeOfShame.healing / fightDuration * 1000)} HPS
          </dfn>
        ),
      },
      this.modules.eithas.active && {
        id: ITEMS.EITHAS_LUNAR_GLIDES.id,
        icon: <ItemIcon id={ITEMS.EITHAS_LUNAR_GLIDES.id} />,
      title: <ItemLink id={ITEMS.EITHAS_LUNAR_GLIDES.id} />,
        result: (
          <dfn data-tip="The actual effective healing contributed by the Ei\'thas, Lunar Glides of Eramas equip effect.">
            {((eithasHealingPercentage * 100) || 0).toFixed(2)} % / {formatNumber(this.modules.eithas.healing / fightDuration * 1000)} HPS
          </dfn>
        ),
      },
    ];

    results.tabs = [
      {
        title: 'Suggestions',
        url: 'suggestions',
        render: () => (
          <SuggestionsTab issues={results.issues} />
        ),
      },
      {
        title: 'Cast efficiency',
        url: 'cast-efficiency',
        render: () => (
          <CastEfficiencyTab
            categories={castEfficiencyCategories}
            abilities={castEfficiency}
          />
        ),
      },
      {
        title: 'Cooldowns',
        url: 'cooldowns',
        render: () => (
          <CooldownsTab
            fightStart={this.fight.start_time}
            fightEnd={this.fight.end_time}
            cooldowns={this.modules.cooldownTracker.cooldowns}
            showOutputStatistics
          />
        ),
      },
      {
        title: 'Talents',
        url: 'talents',
        render: () => (
          <TalentsTab combatant={this.selectedCombatant} />
        ),
      },
      {
        title: 'Mana',
        url: 'mana',
        render: () => (
          <ManaTab
            reportCode={this.report.code}
            actorId={this.playerId}
            start={this.fight.start_time}
            end={this.fight.end_time}
          />
        ),
      },
    ];

    return results;
  }
}

export default CombatLogParser;
