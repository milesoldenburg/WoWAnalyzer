import Module from 'Main/Parser/Module';

import Combatant from './Combatant';

class Combatants extends Module {
  players = {};
  get selected() {
    return this.players[this.owner.player.id];
  }

  on_combatantinfo(event) {
    this.players[event.sourceID] = new Combatant(this.owner.playersById[event.sourceID], event);
  }
}

export default Combatants;