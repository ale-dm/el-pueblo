# Elo

Fuente: https://town-of-salem.fandom.com/wiki/Elo

Rating in Town of Salem[]

The rating system is a system that ensures that similarly rated players are matched against each other while playing Ranked games, both in regular play and the exclusive Coven mode. The system used by the game is inspired by the Elo rating system, which was initially created by Arpad Elo as a method to rank chess players, but has since expanded to many other competitive games. Before Season One (released September 2017), the rating was called Elo. The two terms are often used interchangeably.

On December 4th 2017, it was announced that Season One was over. Between the two seasons is what is known as "offseason", where you will not gain or lose rating whilst playing Ranked. Season Six is currently in session.

Players may check their current rating by completing a Ranked game, exiting to the End Game Lobby and viewing the top-right of the screen. You may also check your Current Rating and Season High Rating by clicking Play on the home screen and then Ranked - they are just above the "Join Queue" button. Lastly, you can check your Season High and Career High rating by using the "Statistics" tab.

There are six rating tiers:

Bronze

0-999

Silver

1000-1399

Gold

1400-1599

Platinum

1600-1799

Diamond

1800-1999

Master

2000+

How the rating system works[]

Each player starts off with a rating of 1200 - the Silver bracket. Your first ten games in Ranked are called Placement Games. These Placement Games are worth an estimated three times the normal amount of rating gained/lost, but you are not shown how much after each game. After your 10th game, you will be placed in a bracket with a specific rating.

If you played during Legacy Season (before June 20th 2017), you will have a shadow rating which is near the bottom of the bracket you finished in (i.e. if you had a rating of 1753, your shadow rating would be 1600 as this is the lower end of the Platinum bracket). Note that the shadow rating for Silver is 1200, and suspected to be around 900 for Bronze (instead of 1000 and 0 respectively).

Winning games will cause a player's rating to rise while losing games will cause the player's rating to fall. Draws do not affect a player's Elo. There are three factors which affect the amount of rating gained or lost:

The player's faction (and more specifically, the winrate of that faction).

The rating difference between your team's average and your opponents' average.

A k-factor, which essentially limits the extremes of how much you can gain or lose per game.

As of season 4, the exact algorithm for calculating rating score gain/loss is:

Get the player's base k-factor based on their rating tier. Master players have a k-factor of 15, Diamond players have a k-factor of 25 and everyone else has a k-factor of 30.

baseK = The base k-factor for the player's tier

If the player is in their placement games, multiply their base k-factor by a placement multiplier to get their true k-factor. Otherwise, the base k-factor is used as the true k-factor. In seasons 3 and 4, the placement multiplier was 3.

If in placement games: k = baseK × placementMultiplier

Else: k = baseK

Determine the average rating for the player's team. For Town roles, the team is Town. For Mafia roles, the team is Mafia. Each Neutral role is its own team.

myTeamRating = The average rating for the player's team

Determine the average rating for the player's opposing team. Note: The opposing team isn't always whoever's not in the player's team. For example, Witch's opposing team is Town.

opposingTeamRating = The average rating for the player's opposing team

Apply the Elo algorithm using the previously determined values as the parameters.

eloChange = GetEloChange(myTeamRating, opposingTeamRating, k);

Clamp the minimum absolute rating change at 1.

|clampedChange| = Max(|eloChange|, 1)

Determine a win rate modifier. This is done "offline" periodically by analysing each team's win rate.

winRateModifier = 1 - teamWinRate

Apply the win rate modifier to the rating change.

ratingChange = clampedChange × winRateModifier

Playing against higher rating opponents gives you more rating on a win than a loss would take away if you lost (especially when on a team whose win rate is less than 50%).

Note that Master and Diamond players have a reduced k-factor, meaning they gain and lose less on average, making it quite hard to fall from the higher ranks - especially Master.

Tips for gaining rating[]

Gaining rating is dependent on other players, and thus if you end up in a game with smart players, your chances of them helping you out and also the chances of them countering smart players in other factions increase. It also becomes easier to win with Town. So, in Ranked, if you played with generally smart players, you should stay in the lobby.

On the contrary, if you were just in a game with people you know like to gamethrow, are known to cheat, mess around too much and don't play seriously, or make tons of mistakes, then wait out the queue twice or go play another mode before returning to Ranked. This does not mean don't ever have fun in this game or that if you make mistakes you are a terrible person, but hunting rating requires focus and attention.

The longer one plays for, the better a player becomes, especially if one plays for long times at once. While some players may not be able to play a lot, it is true that playing games with 30 minutes in between each game is less likely to produce good rating results than playing those games right after another.

If you know you aren't very good if you haven't played a game sometime earlier in the day, play a game of Ranked Practice before going into Ranked.

Stay focused. If you need to do something, do it first and then come back to the game so you don't become distracted. Remember to do even boring things that you must first because as time wears on you'll be distracted and stressed about the responsibility.

You shouldn't ever leave a game unless you have zero chance of winning, such as you are outnumbered by evils or have no chance to survive. This is because some roles have the ability to turn the game around or at least force a draw, such as a Mayor, Retributionist, or Veteran.

Leaving a Ranked game does not mean your rating will stay the same - the result of the game, whether or not you chose to stay, will bring your rating up or down. This is mainly to prevent "rating farming", a tactic players used in early Ranked seasons to never lose rating by simply leaving matches they were about to lose. 

ELO penalty for leaving ranked games[]

You will be severely penalized for quitting ranked games while you are alive. There will be no warnings or grace periods. If you leave while alive you will lose the maximum amount of ELO for your rank. This is 30 points in Bronze through Diamond and 15 points in Master. You will lose ELO (it counts as a loss) even if your team wins if you quit while dead. You will only be severely punished for quitting while alive. If you quit while dead the game will count as a loss for you, but you will not lose heaps of ELO. You will only lose the normal amount as if you had stayed and your team lost.

It is recommended that you do not leave Ranked games at all as a Town role because of possible Mediums. However, leaving as a dead Executioner that did not win or a dead Witch will not make a difference as you have no way to win the match.

Season 1 Rating Bug[]

In season 1, there was a bug in the algorithm that calculated people's rating. Although the exact details of the bug are not known, a BMG developer explained the issue on June 5th, 2017, the day after season 1 ended. He explained in a post on Steam that "In our latest pass on the rating algorithm we noticed something off. Really off. The amount of rating people were losing was calculated incorrectly. People were losing the amount of rating they would have won, had they won the match....As a result of this miscalculation there has been a Rich get Richer, Poor get Poorer dynamic that has developed." The bug was fixed during the offseason of season 1 and there has been no reported rating bug since then. You can read the full report here: https://steamcommunity.com/app/334230/discussions/0/1290691937728170057/ .
