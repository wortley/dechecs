from collections import defaultdict


class GameRegistry:

    def __init__(self):
        self.players_to_gids = {}
        self.gids_to_ctags = defaultdict(list)

    def get_gid(self, sid):
        return self.players_to_gids.get(sid, None)

    def add_player_gid_record(self, sid, gid):
        self.players_to_gids[sid] = gid

    def remove_player_gid_record(self, sid):
        self.players_to_gids.pop(sid, None)

    def get_game_ctags(self, gid):
        return self.gids_to_ctags.get(gid, [])

    def add_game_ctag(self, gid, ctag):
        self.gids_to_ctags[gid].append(ctag)

    def remove_game_ctag(self, gid, ctag):
        if gid in self.gids_to_ctags:
            self.gids_to_ctags[gid].remove(ctag)

    def remove_all_game_ctags(self, gid):
        self.gids_to_ctags.pop(gid, None)

    def clear(self):
        self.players_to_gids.clear()
        self.gids_to_ctags.clear()
