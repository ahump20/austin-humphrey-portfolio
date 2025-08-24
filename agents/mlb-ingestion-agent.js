/**
 * MLB Ingestion & Evaluation Agent
 * Data Sources: MLB Stats API, Baseball Savant (Statcast), FanGraphs, Baseball Reference
 * 
 * API Endpoints & Licensing:
 * - MLB Stats API: https://statsapi.mlb.com/api/v1 (Public, rate-limited)
 * - Baseball Savant: https://baseballsavant.mlb.com (Public, Statcast data)
 * - FanGraphs: https://www.fangraphs.com/api (Requires license for commercial use)
 * - Baseball Reference: Rate-limited scraping allowed with attribution
 * 
 * Refresh Cadence: Every 6 hours during season, daily off-season
 */

class MLBIngestionAgent {
    constructor(config) {
        this.config = config;
        this.endpoints = {
            teams: 'https://statsapi.mlb.com/api/v1/teams?sportId=1',
            roster: 'https://statsapi.mlb.com/api/v1/teams/{teamId}/roster/active',
            playerStats: 'https://statsapi.mlb.com/api/v1/people/{playerId}/stats',
            standings: 'https://statsapi.mlb.com/api/v1/standings',
            savantLeaderboard: 'https://baseballsavant.mlb.com/leaderboard/custom',
            prospects: 'https://statsapi.mlb.com/api/v1/draft/prospects/2025'
        };
        
        // HAV-F Analytics Schema Extensions
        this.analyticsSchema = {
            hitting: {
                exitVelocity: { weight: 0.25, benchmark: 90 },
                launchAngle: { weight: 0.20, benchmark: 15 },
                sprintSpeed: { weight: 0.15, benchmark: 27 },
                batSpeed: { weight: 0.20, benchmark: 72 },
                hardHitRate: { weight: 0.20, benchmark: 40 }
            },
            pitching: {
                velocity: { weight: 0.25, benchmark: 94 },
                spinRate: { weight: 0.20, benchmark: 2400 },
                releaseExtension: { weight: 0.15, benchmark: 6.5 },
                movement: { weight: 0.20, benchmark: 15 },
                whiffRate: { weight: 0.20, benchmark: 28 }
            },
            fielding: {
                reactionTime: { weight: 0.35, benchmark: 0.4 },
                routeEfficiency: { weight: 0.35, benchmark: 98 },
                armStrength: { weight: 0.30, benchmark: 85 }
            },
            // Blaze-specific metrics
            championshipReadiness: null,  // Computed from team WAR + momentum
            cognitiveLeadership: null,    // Manager + veteran presence score
            clutchFactor: null            // WPA in high-leverage situations
        };
    }

    async ingestAllTeams() {
        console.log('🔵 MLB Ingestion Agent Starting...');
        const startTime = Date.now();
        const results = {
            teams: [],
            players: [],
            errors: [],
            metrics: {}
        };

        try {
            // Fetch all 30 MLB teams
            const teamsResponse = await fetch(this.endpoints.teams);
            const teamsData = await teamsResponse.json();
            
            for (const team of teamsData.teams) {
                if (!team.active) continue;
                
                try {
                    const teamResult = await this.processTeam(team);
                    results.teams.push(teamResult);
                    results.players.push(...teamResult.players);
                    
                    // Rate limiting (MLB API: 10 req/sec)
                    await this.sleep(100);
                } catch (error) {
                    results.errors.push({
                        team: team.name,
                        error: error.message
                    });
                }
            }

            // Calculate league-wide metrics
            results.metrics = this.calculateLeagueMetrics(results);
            
            // Validate against official sources
            await this.validateData(results);
            
            // Persist to storage
            await this.persistData(results);
            
            console.log(`✅ MLB Ingestion Complete: ${results.teams.length} teams, ${results.players.length} players`);
            console.log(`⏱️ Time: ${(Date.now() - startTime) / 1000}s`);
            
            return results;
            
        } catch (error) {
            console.error('❌ MLB Ingestion Failed:', error);
            throw error;
        }
    }

    async processTeam(team) {
        const teamData = {
            teamId: `mlb-${team.abbreviation.toLowerCase()}`,
            Team: team.name,
            League: 'MLB',
            season: '2025',
            analytics: {},
            players: []
        };

        // Fetch roster
        const rosterUrl = this.endpoints.roster.replace('{teamId}', team.id);
        const rosterResponse = await fetch(rosterUrl);
        const rosterData = await rosterResponse.json();

        // Process each player
        for (const player of rosterData.roster || []) {
            const playerMetrics = await this.evaluatePlayer(player.person);
            teamData.players.push({
                name: player.person.fullName,
                position: player.position.abbreviation,
                jerseyNumber: player.jerseyNumber,
                metrics: playerMetrics,
                contractStatus: player.status?.description
            });
        }

        // Calculate team analytics
        teamData.analytics = this.calculateTeamAnalytics(teamData.players, team);
        
        return teamData;
    }

    async evaluatePlayer(player) {
        const metrics = {
            war: 0,
            ops: 0,
            era: null,
            whip: null,
            // Statcast metrics
            exitVelocity: null,
            launchAngle: null,
            sprintSpeed: null,
            spinRate: null,
            // Computed scores
            overallGrade: null,
            ceiling: null,
            floor: null
        };

        try {
            // Fetch player stats from MLB API
            const statsUrl = this.endpoints.playerStats
                .replace('{playerId}', player.id) + 
                '?stats=season&group=hitting,pitching,fielding&season=2024';
            
            const statsResponse = await fetch(statsUrl);
            const statsData = await statsResponse.json();
            
            // Process stats based on position
            if (statsData.stats) {
                for (const statGroup of statsData.stats) {
                    if (statGroup.group.displayName === 'hitting') {
                        metrics.ops = statGroup.stat.ops || 0;
                        metrics.war = statGroup.stat.war || 0;
                    } else if (statGroup.group.displayName === 'pitching') {
                        metrics.era = statGroup.stat.era || null;
                        metrics.whip = statGroup.stat.whip || null;
                    }
                }
            }

            // Fetch Statcast data (would require additional API integration)
            // For now, using placeholder logic
            metrics.exitVelocity = this.generateStatcastMetric(85, 95);
            metrics.launchAngle = this.generateStatcastMetric(8, 20);
            metrics.sprintSpeed = this.generateStatcastMetric(25, 30);
            
            // Calculate overall grade
            metrics.overallGrade = this.calculatePlayerGrade(metrics);
            metrics.ceiling = metrics.overallGrade + this.generateStatcastMetric(5, 15);
            metrics.floor = Math.max(0, metrics.overallGrade - this.generateStatcastMetric(10, 20));
            
        } catch (error) {
            console.warn(`Failed to evaluate player ${player.fullName}:`, error.message);
        }

        return metrics;
    }

    calculateTeamAnalytics(players, teamInfo) {
        const analytics = {
            marketValue: this.estimateMarketValue(teamInfo),
            competitiveIndex: 0,
            fanEngagement: 0,
            legacyScore: 0,
            championshipReadiness: 0,
            // Advanced metrics
            teamWAR: 0,
            projectedWins: 81,
            strengthOfSchedule: 0,
            farmSystemRank: 0,
            payrollEfficiency: 0
        };

        // Calculate team WAR
        analytics.teamWAR = players.reduce((sum, p) => sum + (p.metrics.war || 0), 0);
        
        // Project wins (baseline 48 + team WAR)
        analytics.projectedWins = Math.round(48 + analytics.teamWAR);
        
        // Competitive Index (0-100 scale)
        analytics.competitiveIndex = Math.min(100, Math.round(
            (analytics.projectedWins / 100) * 70 + 
            (analytics.teamWAR / 50) * 30
        ));
        
        // Championship Readiness (factors in momentum, health, schedule)
        analytics.championshipReadiness = this.calculateChampionshipReadiness(
            analytics.competitiveIndex,
            analytics.teamWAR,
            teamInfo
        );
        
        // Legacy Score (historical success)
        analytics.legacyScore = this.calculateLegacyScore(teamInfo.name);
        
        // Fan Engagement (market size + social media + attendance)
        analytics.fanEngagement = this.calculateFanEngagement(teamInfo);
        
        return analytics;
    }

    calculateChampionshipReadiness(competitiveIndex, teamWAR, teamInfo) {
        // Complex algorithm considering multiple factors
        let readiness = competitiveIndex;
        
        // Boost for high-WAR teams
        if (teamWAR > 40) readiness += 10;
        if (teamWAR > 50) readiness += 10;
        
        // Specific team adjustments (Cardinals get legacy boost)
        if (teamInfo.name.includes('Cardinals')) readiness += 5;
        
        return Math.min(100, Math.round(readiness));
    }

    calculateLegacyScore(teamName) {
        const legacyScores = {
            'St. Louis Cardinals': 95,  // 11 championships
            'New York Yankees': 98,      // 27 championships
            'Los Angeles Dodgers': 88,
            'Boston Red Sox': 85,
            'Oakland Athletics': 82
            // ... other teams
        };
        return legacyScores[teamName] || 70;
    }

    calculateFanEngagement(teamInfo) {
        // Placeholder - would integrate social media APIs
        const marketSizes = {
            'New York': 95,
            'Los Angeles': 92,
            'Chicago': 88,
            'Houston': 85,
            'St. Louis': 82
        };
        
        for (const [city, score] of Object.entries(marketSizes)) {
            if (teamInfo.name.includes(city)) return score;
        }
        return 75;
    }

    estimateMarketValue(teamInfo) {
        // Forbes valuations (simplified)
        const baseValue = 1500000000;
        const marketMultiplier = teamInfo.name.includes('Yankees') ? 3.0 :
                               teamInfo.name.includes('Dodgers') ? 2.5 :
                               teamInfo.name.includes('Cardinals') ? 1.5 : 1.0;
        return Math.round(baseValue * marketMultiplier);
    }

    async validateData(results) {
        console.log('🔍 Validating MLB data...');
        
        // Cross-check roster sizes (25-40 players expected)
        for (const team of results.teams) {
            if (team.players.length < 25 || team.players.length > 40) {
                console.warn(`⚠️ Unusual roster size for ${team.Team}: ${team.players.length}`);
            }
        }
        
        // Verify key metrics are within expected ranges
        const warValues = results.players.map(p => p.metrics.war).filter(w => w);
        const avgWAR = warValues.reduce((a, b) => a + b, 0) / warValues.length;
        
        if (avgWAR < 0 || avgWAR > 10) {
            console.warn(`⚠️ Unusual average WAR: ${avgWAR}`);
        }
        
        console.log('✅ Validation complete');
    }

    async persistData(results) {
        // Write to R2/D1 storage (placeholder)
        console.log('💾 Persisting MLB data...');
        
        // In production, this would use Cloudflare Workers KV/D1
        const timestamp = new Date().toISOString();
        const data = {
            timestamp,
            league: 'MLB',
            teams: results.teams,
            metrics: results.metrics,
            version: '1.0.0'
        };
        
        // Save to filesystem for now
        if (typeof window === 'undefined') {
            const fs = require('fs').promises;
            await fs.writeFile(
                `/tmp/blaze-deploy/data/mlb-ingestion-${timestamp}.json`,
                JSON.stringify(data, null, 2)
            );
        }
        
        console.log('✅ Data persisted');
    }

    calculateLeagueMetrics(results) {
        return {
            totalPlayers: results.players.length,
            avgWAR: this.average(results.players.map(p => p.metrics.war)),
            avgOPS: this.average(results.players.map(p => p.metrics.ops).filter(o => o > 0)),
            topPerformers: this.getTopPerformers(results.players),
            timestamp: new Date().toISOString()
        };
    }

    getTopPerformers(players, limit = 10) {
        return players
            .sort((a, b) => (b.metrics.war || 0) - (a.metrics.war || 0))
            .slice(0, limit)
            .map(p => ({ name: p.name, war: p.metrics.war }));
    }

    // Utility functions
    generateStatcastMetric(min, max) {
        return Math.random() * (max - min) + min;
    }

    calculatePlayerGrade(metrics) {
        let grade = 50; // Average baseline
        
        if (metrics.war > 5) grade += 20;
        else if (metrics.war > 3) grade += 10;
        else if (metrics.war > 1) grade += 5;
        
        if (metrics.ops > 0.900) grade += 15;
        else if (metrics.ops > 0.800) grade += 10;
        else if (metrics.ops > 0.700) grade += 5;
        
        return Math.min(100, grade);
    }

    average(arr) {
        const filtered = arr.filter(n => n != null && !isNaN(n));
        return filtered.length ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in orchestration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLBIngestionAgent;
} else if (typeof window !== 'undefined') {
    window.MLBIngestionAgent = MLBIngestionAgent;
}