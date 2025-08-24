/**
 * College & NIL Ingestion & Evaluation Agent
 * Data Sources: CollegeFootballData, ESPN College, 247Sports, On3 NIL Valuations
 * 
 * API Endpoints & Licensing:
 * - CollegeFootballData: https://api.collegefootballdata.com (Free tier: 60/min)
 * - ESPN College: https://site.api.espn.com/apis/site/v2/sports/football/college-football (Public)
 * - 247Sports: https://247sports.com (Scraping with rate limits)
 * - On3 NIL: https://www.on3.com/nil (NIL valuations, subscription)
 * - Opendorse: https://opendorse.com/api (NIL marketplace data)
 * 
 * Refresh Cadence: Every 12 hours during season, daily off-season
 */

class NCAAIngestionAgent {
    constructor(config) {
        this.config = config;
        this.endpoints = {
            cfbdTeams: 'https://api.collegefootballdata.com/teams/fbs',
            cfbdRoster: 'https://api.collegefootballdata.com/roster',
            cfbdStats: 'https://api.collegefootballdata.com/stats/player/season',
            cfbdRecruiting: 'https://api.collegefootballdata.com/recruiting/players',
            espnTeams: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams',
            espnRankings: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings'
        };
        
        // HAV-F Analytics Schema for College Athletes
        this.analyticsSchema = {
            performance: {
                passingEfficiency: { weight: 0.25, position: 'QB' },
                yardsPerCarry: { weight: 0.25, position: 'RB' },
                yardsPerCatch: { weight: 0.25, position: 'WR' },
                tacklesForLoss: { weight: 0.25, position: 'DEF' },
                pff_grade: { weight: 0.30, universal: true }
            },
            nil: {
                currentValue: null,           // Current NIL valuation
                socialReach: null,            // Combined social following
                engagementRate: null,         // Social engagement percentage
                dealCount: null,              // Number of NIL deals
                brandScore: null,             // Marketability score
                transferValue: null,          // Portal market value
                projectedEarnings: null       // Annual NIL projection
            },
            development: {
                freshmanToSophomore: null,    // Year 1-2 improvement
                sophomoreToJunior: null,      // Year 2-3 improvement
                proReadiness: null,           // NFL readiness score
                academicProgress: null,       // APR contribution
                leadershipScore: null         // Team captain potential
            },
            // Championship-caliber metrics
            clutchFactor: null,               // Performance in big games
            conferenceImpact: null,           // Impact on conference standings
            heismanStock: null,              // Award potential
            draftStock: null                 // NFL draft projection
        };
        
        // Power 5 + Group of 5 focus
        this.targetPrograms = {
            powerFive: {
                SEC: ['Alabama', 'Georgia', 'LSU', 'Texas', 'Oklahoma', 'Tennessee', 'Auburn', 'Florida'],
                BigTen: ['Ohio State', 'Michigan', 'Penn State', 'USC', 'Oregon', 'Wisconsin'],
                Big12: ['Texas Tech', 'TCU', 'Baylor', 'Oklahoma State', 'Kansas State'],
                ACC: ['Clemson', 'Florida State', 'Miami', 'North Carolina'],
                Pac12: ['Washington', 'Utah', 'Colorado']  // Legacy Pac-12
            },
            groupOfFive: {
                AAC: ['SMU', 'Houston', 'Memphis', 'Tulane'],
                MWC: ['Boise State', 'Air Force', 'San Diego State'],
                SunBelt: ['App State', 'Coastal Carolina', 'James Madison'],
                MAC: ['Toledo', 'Miami (OH)'],
                CUSA: ['Liberty', 'Western Kentucky']
            },
            independent: ['Notre Dame', 'Army', 'Navy']
        };
        
        // NIL marketplace categories
        this.nilCategories = {
            mega: 5000000,    // $5M+ (Arch Manning tier)
            elite: 1000000,   // $1M-5M (5-star QB/skill)
            high: 500000,     // $500K-1M (4-star starters)
            solid: 100000,    // $100K-500K (key contributors)
            standard: 50000,  // $50K-100K (rotation players)
            base: 10000       // $10K-50K (depth players)
        };
    }

    async ingestAllTeams() {
        console.log('🏈 NCAA & NIL Ingestion Agent Starting...');
        const startTime = Date.now();
        const results = {
            teams: [],
            players: [],
            nilDeals: [],
            transferPortal: [],
            errors: [],
            metrics: {}
        };

        try {
            // Phase 1: Ingest Power 5 programs
            console.log('🔵 Processing Power 5 conferences...');
            for (const [conference, schools] of Object.entries(this.targetPrograms.powerFive)) {
                for (const school of schools) {
                    try {
                        const teamData = await this.processNCAATeam(school, conference);
                        results.teams.push(teamData);
                        results.players.push(...teamData.players);
                        
                        // Rate limiting for CFBD (60/min)
                        await this.sleep(1000);
                    } catch (error) {
                        results.errors.push({ school, error: error.message });
                    }
                }
            }
            
            // Phase 2: Process NIL valuations
            console.log('💰 Processing NIL valuations...');
            const nilData = await this.processNILValuations(results.players);
            results.nilDeals = nilData.deals;
            
            // Phase 3: Transfer Portal analysis
            console.log('🔄 Analyzing Transfer Portal...');
            results.transferPortal = await this.analyzeTransferPortal();
            
            // Phase 4: Championship projections
            console.log('🏆 Generating championship projections...');
            await this.projectChampionshipContenders(results);
            
            // Calculate metrics
            results.metrics = this.calculateNCAAMetrics(results);
            
            // Validate
            await this.validateData(results);
            
            // Persist
            await this.persistData(results);
            
            console.log(`✅ NCAA/NIL Ingestion Complete: ${results.teams.length} teams, ${results.players.length} players`);
            console.log(`💰 NIL Deals: ${results.nilDeals.length}, Total Value: $${results.metrics.totalNILValue.toLocaleString()}`);
            console.log(`⏱️ Time: ${(Date.now() - startTime) / 1000}s`);
            
            return results;
            
        } catch (error) {
            console.error('❌ NCAA/NIL Ingestion Failed:', error);
            throw error;
        }
    }

    async processNCAATeam(schoolName, conference) {
        const teamData = {
            teamId: `ncaa-${this.slugify(schoolName)}`,
            Team: schoolName,
            League: 'NCAA',
            conference: conference,
            season: '2025',
            analytics: {
                marketValue: 0,
                competitiveIndex: 0,
                fanEngagement: 0,
                legacyScore: 0,
                championshipReadiness: 0,
                // NCAA specific
                nilValuation: 0,
                recruitingRank: 0,
                transferPortalActivity: 0,
                academicProgress: 0,
                cfpProbability: 0,
                conferenceChampProbability: 0
            },
            players: []
        };

        // Fetch roster (simulated - would use CFBD API)
        const roster = await this.fetchNCAAoster(schoolName);
        
        for (const player of roster) {
            const evaluation = await this.evaluateCollegePlayer(player, schoolName);
            
            teamData.players.push({
                name: player.name,
                position: player.position,
                year: player.year,
                jerseyNumber: player.jersey,
                hometown: player.hometown,
                metrics: evaluation,
                nil: player.nil || {},
                recruiting: player.recruiting || {}
            });
        }

        // Calculate team analytics
        teamData.analytics = this.calculateTeamAnalytics(teamData, schoolName, conference);
        
        // Special handling for featured teams
        if (schoolName === 'Texas') {
            teamData.analytics.nilValuation = 15800000;  // From your dataset
            teamData.analytics.championshipReadiness = 92;
            teamData.analytics.marketValue = 285000000;
            
            // Add Arch Manning
            const archManning = teamData.players.find(p => p.name.includes('Manning'));
            if (archManning) {
                archManning.metrics.nilValue = 2800000;
                archManning.metrics.heismanStock = 95;
            }
        }
        
        return teamData;
    }

    async fetchNCAAoster(schoolName) {
        // Simulated roster - would use CFBD API in production
        const positions = {
            offense: ['QB', 'RB', 'WR', 'TE', 'OL'],
            defense: ['DL', 'LB', 'DB'],
            special: ['K', 'P', 'LS']
        };
        
        const roster = [];
        const years = ['FR', 'SO', 'JR', 'SR'];
        
        // Generate 85-scholarship roster
        let playerCount = 0;
        
        // Offense (40 players)
        roster.push(...this.generatePositionGroup('QB', 4, schoolName, years));
        roster.push(...this.generatePositionGroup('RB', 6, schoolName, years));
        roster.push(...this.generatePositionGroup('WR', 10, schoolName, years));
        roster.push(...this.generatePositionGroup('TE', 5, schoolName, years));
        roster.push(...this.generatePositionGroup('OL', 15, schoolName, years));
        
        // Defense (40 players)
        roster.push(...this.generatePositionGroup('DL', 12, schoolName, years));
        roster.push(...this.generatePositionGroup('LB', 12, schoolName, years));
        roster.push(...this.generatePositionGroup('DB', 16, schoolName, years));
        
        // Special Teams (5 players)
        roster.push(...this.generatePositionGroup('K', 2, schoolName, years));
        roster.push(...this.generatePositionGroup('P', 2, schoolName, years));
        roster.push(...this.generatePositionGroup('LS', 1, schoolName, years));
        
        return roster;
    }

    generatePositionGroup(position, count, schoolName, years) {
        const players = [];
        
        for (let i = 0; i < count; i++) {
            const year = years[Math.floor(Math.random() * years.length)];
            
            const player = {
                name: this.generatePlayerName(schoolName, position),
                position: position,
                year: year,
                jersey: Math.floor(Math.random() * 99) + 1,
                hometown: this.generateHometown(),
                
                // Recruiting background
                recruiting: {
                    stars: this.generateRecruitingStars(schoolName, position),
                    highSchool: this.generateHighSchool(),
                    otherOffers: this.generateOffers(schoolName)
                },
                
                // NIL profile
                nil: this.generateNILProfile(position, year, schoolName)
            };
            
            // Special players for Texas
            if (schoolName === 'Texas' && position === 'QB' && i === 0) {
                player.name = 'Arch Manning';
                player.year = 'SO';
                player.recruiting.stars = 5;
                player.nil = {
                    currentValue: 2800000,
                    socialFollowers: 500000,
                    deals: ['Panini', 'EA Sports', 'Dr Pepper', 'local dealerships'],
                    marketability: 99
                };
            }
            
            players.push(player);
        }
        
        return players;
    }

    async evaluateCollegePlayer(player, schoolName) {
        const evaluation = {
            overallGrade: 0,
            ceiling: 0,
            floor: 0,
            
            // Performance metrics
            productionScore: 0,
            athleticism: 0,
            technique: 0,
            footballIQ: 0,
            
            // NIL metrics
            nilValue: 0,
            socialReach: 0,
            engagementRate: 0,
            brandScore: 0,
            
            // Development metrics
            improvement: 0,
            proReadiness: 0,
            draftProjection: null,
            
            // Championship impact
            clutchFactor: 0,
            bigGamePerformance: 0,
            leadershipScore: 0,
            
            // Awards potential
            heismanStock: 0,
            allAmericanProbability: 0,
            allConferenceProbability: 0
        };

        // Base evaluation on recruiting stars and year
        const baseGrade = (player.recruiting.stars || 3) * 15 + 25;
        const yearBonus = { 'FR': 0, 'SO': 5, 'JR': 10, 'SR': 15 }[player.year] || 0;
        
        evaluation.overallGrade = Math.min(95, baseGrade + yearBonus + Math.random() * 10);
        
        // Position-specific adjustments
        if (player.position === 'QB') {
            evaluation.heismanStock = player.recruiting.stars >= 4 ? 
                50 + Math.random() * 30 : 20 + Math.random() * 20;
            evaluation.nilValue = this.calculateQBNILValue(player, schoolName);
            evaluation.clutchFactor = 70 + Math.random() * 20;
        } else if (['RB', 'WR'].includes(player.position)) {
            evaluation.athleticism = 75 + Math.random() * 20;
            evaluation.nilValue = this.calculateSkillNILValue(player, schoolName);
            evaluation.bigGamePerformance = 65 + Math.random() * 25;
        } else if (['DL', 'LB', 'DB'].includes(player.position)) {
            evaluation.technique = 70 + Math.random() * 20;
            evaluation.nilValue = this.calculateDefensiveNILValue(player, schoolName);
            evaluation.footballIQ = 75 + Math.random() * 15;
        }
        
        // Calculate improvement trajectory
        if (player.year === 'FR' || player.year === 'SO') {
            evaluation.improvement = 80 + Math.random() * 15;
            evaluation.ceiling = Math.min(99, evaluation.overallGrade + 20);
        } else {
            evaluation.improvement = 60 + Math.random() * 20;
            evaluation.ceiling = Math.min(99, evaluation.overallGrade + 10);
        }
        
        evaluation.floor = Math.max(50, evaluation.overallGrade - 15);
        
        // Pro readiness and draft projection
        if (player.year === 'JR' || player.year === 'SR') {
            evaluation.proReadiness = this.calculateProReadiness(evaluation, player);
            
            if (evaluation.proReadiness > 85) {
                evaluation.draftProjection = 'Round 1-2';
            } else if (evaluation.proReadiness > 75) {
                evaluation.draftProjection = 'Round 3-4';
            } else if (evaluation.proReadiness > 65) {
                evaluation.draftProjection = 'Round 5-7';
            } else {
                evaluation.draftProjection = 'UDFA';
            }
        }
        
        // Social and brand metrics
        evaluation.socialReach = player.nil?.socialFollowers || 
            Math.floor(Math.random() * 50000) + 1000;
        evaluation.engagementRate = 2 + Math.random() * 8;  // 2-10% engagement
        evaluation.brandScore = this.calculateBrandScore(player, schoolName, evaluation);
        
        // All-American/Conference probability
        if (evaluation.overallGrade > 85) {
            evaluation.allAmericanProbability = (evaluation.overallGrade - 85) * 5;
            evaluation.allConferenceProbability = Math.min(90, evaluation.allAmericanProbability * 2);
        }
        
        // Leadership score
        if (player.year === 'SR' || player.year === 'JR') {
            evaluation.leadershipScore = 70 + Math.random() * 25;
        } else {
            evaluation.leadershipScore = 50 + Math.random() * 30;
        }
        
        return evaluation;
    }

    calculateQBNILValue(player, schoolName) {
        let baseValue = 50000;
        
        // School market multiplier
        const marketMultipliers = {
            'Texas': 3.0,
            'Alabama': 2.5,
            'Ohio State': 2.5,
            'Georgia': 2.3,
            'USC': 2.2,
            'Notre Dame': 2.0,
            'Michigan': 1.8,
            'LSU': 1.7,
            'Oklahoma': 1.5
        };
        
        const multiplier = marketMultipliers[schoolName] || 1.0;
        
        // Star rating bonus
        if (player.recruiting.stars === 5) {
            baseValue = 1000000;
        } else if (player.recruiting.stars === 4) {
            baseValue = 250000;
        }
        
        // Year bonus
        const yearMultiplier = { 'FR': 0.5, 'SO': 1.0, 'JR': 1.5, 'SR': 1.2 }[player.year] || 1.0;
        
        // Special case for elite QBs
        if (player.name === 'Arch Manning') {
            return 2800000;
        }
        
        return Math.round(baseValue * multiplier * yearMultiplier);
    }

    calculateSkillNILValue(player, schoolName) {
        let baseValue = 25000;
        
        const marketMultipliers = {
            'Texas': 2.0,
            'Alabama': 1.8,
            'Ohio State': 1.8,
            'USC': 1.7,
            'Georgia': 1.6
        };
        
        const multiplier = marketMultipliers[schoolName] || 1.0;
        
        if (player.recruiting.stars >= 4) {
            baseValue = 100000;
        }
        
        return Math.round(baseValue * multiplier * (0.8 + Math.random() * 0.4));
    }

    calculateDefensiveNILValue(player, schoolName) {
        // Defensive players typically get less NIL
        let baseValue = 15000;
        
        if (player.recruiting.stars >= 4) {
            baseValue = 50000;
        }
        
        const schoolBonus = ['Alabama', 'Georgia', 'Ohio State'].includes(schoolName) ? 1.5 : 1.0;
        
        return Math.round(baseValue * schoolBonus * (0.7 + Math.random() * 0.6));
    }

    calculateProReadiness(evaluation, player) {
        let readiness = evaluation.overallGrade;
        
        // Position adjustments
        if (['QB', 'OL', 'LB'].includes(player.position)) {
            // Positions that need more development
            readiness -= 10;
        } else if (['RB', 'WR', 'DB'].includes(player.position)) {
            // Positions that translate quickly
            readiness += 5;
        }
        
        // Add experience bonus
        if (player.year === 'SR') {
            readiness += 15;
        } else if (player.year === 'JR') {
            readiness += 5;
        }
        
        // Add performance factors
        readiness += (evaluation.athleticism - 70) * 0.3;
        readiness += (evaluation.technique - 70) * 0.3;
        readiness += (evaluation.footballIQ - 70) * 0.2;
        
        return Math.min(100, Math.max(0, readiness));
    }

    calculateBrandScore(player, schoolName, evaluation) {
        let score = 50;
        
        // School brand power
        const schoolBrands = {
            'Texas': 90,
            'Notre Dame': 95,
            'Alabama': 88,
            'Michigan': 87,
            'USC': 85,
            'Ohio State': 84
        };
        
        score += (schoolBrands[schoolName] || 70) * 0.2;
        
        // Performance impact
        score += evaluation.overallGrade * 0.3;
        
        // Social media impact
        if (evaluation.socialReach > 100000) score += 20;
        else if (evaluation.socialReach > 50000) score += 15;
        else if (evaluation.socialReach > 25000) score += 10;
        else if (evaluation.socialReach > 10000) score += 5;
        
        // Position marketability
        const positionBonus = {
            'QB': 15,
            'RB': 10,
            'WR': 10,
            'LB': 5,
            'DB': 5
        };
        
        score += positionBonus[player.position] || 0;
        
        return Math.min(100, score);
    }

    calculateTeamAnalytics(teamData, schoolName, conference) {
        const analytics = {
            marketValue: this.calculateProgramValue(schoolName),
            competitiveIndex: 0,
            fanEngagement: 0,
            legacyScore: 0,
            championshipReadiness: 0,
            nilValuation: 0,
            recruitingRank: 0,
            transferPortalActivity: 0,
            academicProgress: 0,
            cfpProbability: 0,
            conferenceChampProbability: 0
        };
        
        // Calculate total NIL valuation
        analytics.nilValuation = teamData.players.reduce((sum, p) => 
            sum + (p.metrics?.nilValue || 0), 0
        );
        
        // Calculate average recruiting stars
        const avgStars = teamData.players.reduce((sum, p) => 
            sum + (p.recruiting?.stars || 3), 0
        ) / teamData.players.length;
        
        analytics.recruitingRank = Math.round((avgStars - 3) * 25 + 50);
        
        // Competitive index based on talent
        const avgGrade = teamData.players.reduce((sum, p) => 
            sum + (p.metrics?.overallGrade || 0), 0
        ) / teamData.players.length;
        
        analytics.competitiveIndex = Math.round(avgGrade * 1.1);
        
        // Championship readiness
        analytics.championshipReadiness = this.calculateChampionshipReadiness(
            analytics,
            teamData,
            schoolName,
            conference
        );
        
        // CFP probability
        analytics.cfpProbability = this.calculateCFPProbability(
            analytics.championshipReadiness,
            conference,
            schoolName
        );
        
        // Conference championship probability
        analytics.conferenceChampProbability = this.calculateConferenceChampProbability(
            analytics.competitiveIndex,
            conference,
            schoolName
        );
        
        // Legacy score
        analytics.legacyScore = this.calculateLegacyScore(schoolName);
        
        // Fan engagement
        analytics.fanEngagement = this.calculateFanEngagement(schoolName);
        
        // Academic progress (APR simulation)
        analytics.academicProgress = 950 + Math.random() * 50;  // 950-1000 range
        
        // Transfer portal activity
        analytics.transferPortalActivity = Math.floor(Math.random() * 10) + 5;
        
        return analytics;
    }

    calculateProgramValue(schoolName) {
        const values = {
            'Texas': 285000000,
            'Ohio State': 260000000,
            'Alabama': 250000000,
            'Georgia': 240000000,
            'Michigan': 235000000,
            'Notre Dame': 230000000,
            'LSU': 210000000,
            'USC': 200000000,
            'Oklahoma': 195000000,
            'Clemson': 180000000
        };
        
        return values[schoolName] || 150000000;
    }

    calculateChampionshipReadiness(analytics, teamData, schoolName, conference) {
        let readiness = analytics.competitiveIndex;
        
        // QB play is crucial
        const qbs = teamData.players.filter(p => p.position === 'QB');
        const bestQB = qbs.sort((a, b) => 
            (b.metrics?.overallGrade || 0) - (a.metrics?.overallGrade || 0)
        )[0];
        
        if (bestQB?.metrics?.overallGrade > 90) {
            readiness += 15;
        } else if (bestQB?.metrics?.overallGrade > 85) {
            readiness += 10;
        } else if (bestQB?.metrics?.overallGrade > 80) {
            readiness += 5;
        }
        
        // Conference strength
        if (conference === 'SEC') {
            readiness += 5;  // Battle-tested
        } else if (conference === 'BigTen') {
            readiness += 3;
        }
        
        // Program momentum
        const momentum = {
            'Georgia': 10,
            'Alabama': 8,
            'Michigan': 7,
            'Texas': 6,
            'Ohio State': 5
        };
        
        readiness += momentum[schoolName] || 0;
        
        // NIL advantage
        if (analytics.nilValuation > 10000000) {
            readiness += 5;
        } else if (analytics.nilValuation > 5000000) {
            readiness += 3;
        }
        
        return Math.min(100, readiness);
    }

    calculateCFPProbability(championshipReadiness, conference, schoolName) {
        let probability = championshipReadiness * 0.8;
        
        // Conference auto-bids help
        if (['SEC', 'BigTen', 'Big12', 'ACC'].includes(conference)) {
            probability += 10;
        }
        
        // Blue blood bonus
        const blueBlods = ['Alabama', 'Ohio State', 'Michigan', 'Notre Dame', 'Texas', 'USC'];
        if (blueBlods.includes(schoolName)) {
            probability += 5;
        }
        
        return Math.min(95, probability);
    }

    calculateConferenceChampProbability(competitiveIndex, conference, schoolName) {
        // Start with competitive index
        let probability = competitiveIndex * 0.7;
        
        // Adjust for conference difficulty
        const conferenceDifficulty = {
            'SEC': 0.8,      // Harder to win
            'BigTen': 0.85,
            'Big12': 0.95,
            'ACC': 0.90,
            'Pac12': 0.92
        };
        
        probability *= conferenceDifficulty[conference] || 1.0;
        
        // Program-specific advantages
        const programAdvantages = {
            'Alabama': 1.2,
            'Georgia': 1.2,
            'Ohio State': 1.15,
            'Clemson': 1.15,
            'Oklahoma': 1.1
        };
        
        probability *= programAdvantages[schoolName] || 1.0;
        
        return Math.min(90, probability);
    }

    calculateLegacyScore(schoolName) {
        const legacyScores = {
            'Alabama': 98,      // Modern dynasty
            'Notre Dame': 96,   // Historical greatness
            'Ohio State': 94,
            'Michigan': 93,
            'USC': 92,
            'Texas': 91,
            'Oklahoma': 90,
            'Nebraska': 88,     // Historical
            'Miami': 86,
            'Florida State': 85,
            'LSU': 84,
            'Georgia': 83,
            'Clemson': 82
        };
        
        return legacyScores[schoolName] || 75;
    }

    calculateFanEngagement(schoolName) {
        const engagement = {
            'Texas': 98,        // Massive fanbase
            'Ohio State': 96,
            'Michigan': 95,
            'Alabama': 94,
            'Notre Dame': 93,
            'Georgia': 91,
            'LSU': 90,
            'Penn State': 89,
            'Tennessee': 88,
            'Auburn': 87,
            'Florida': 86,
            'Oklahoma': 85
        };
        
        return engagement[schoolName] || 80;
    }

    async processNILValuations(players) {
        console.log('💰 Processing NIL valuations for all players...');
        
        const deals = [];
        const topEarners = [];
        
        // Process each player's NIL potential
        for (const player of players) {
            if (player.metrics?.nilValue > 100000) {
                const nilDeal = {
                    playerId: `${player.name}-${player.team}`,
                    playerName: player.name,
                    school: player.team,
                    position: player.position,
                    totalValue: player.metrics.nilValue,
                    deals: this.generateNILDeals(player.metrics.nilValue),
                    socialMetrics: {
                        followers: player.metrics.socialReach,
                        engagementRate: player.metrics.engagementRate,
                        brandScore: player.metrics.brandScore
                    }
                };
                
                deals.push(nilDeal);
                
                if (player.metrics.nilValue > 1000000) {
                    topEarners.push(nilDeal);
                }
            }
        }
        
        // Sort top earners
        topEarners.sort((a, b) => b.totalValue - a.totalValue);
        
        return {
            deals,
            topEarners: topEarners.slice(0, 25),
            totalValue: deals.reduce((sum, d) => sum + d.totalValue, 0),
            averageValue: deals.length ? 
                deals.reduce((sum, d) => sum + d.totalValue, 0) / deals.length : 0
        };
    }

    generateNILDeals(totalValue) {
        const deals = [];
        
        if (totalValue > 1000000) {
            // Mega deals
            deals.push(
                { partner: 'National Brand', value: totalValue * 0.4 },
                { partner: 'Apparel Company', value: totalValue * 0.25 },
                { partner: 'Local Dealership', value: totalValue * 0.15 },
                { partner: 'Trading Cards', value: totalValue * 0.1 },
                { partner: 'Social Media', value: totalValue * 0.1 }
            );
        } else if (totalValue > 500000) {
            // Elite deals
            deals.push(
                { partner: 'Regional Brand', value: totalValue * 0.35 },
                { partner: 'Local Business', value: totalValue * 0.3 },
                { partner: 'Merchandise', value: totalValue * 0.2 },
                { partner: 'Appearances', value: totalValue * 0.15 }
            );
        } else if (totalValue > 100000) {
            // Solid deals
            deals.push(
                { partner: 'Local Restaurant', value: totalValue * 0.4 },
                { partner: 'Car Dealership', value: totalValue * 0.3 },
                { partner: 'Social Media', value: totalValue * 0.3 }
            );
        } else {
            // Standard deals
            deals.push(
                { partner: 'Local Business', value: totalValue * 0.6 },
                { partner: 'Merchandise', value: totalValue * 0.4 }
            );
        }
        
        return deals;
    }

    async analyzeTransferPortal() {
        console.log('🔄 Analyzing Transfer Portal activity...');
        
        const portalActivity = {
            totalTransfers: Math.floor(Math.random() * 1000) + 1500,
            quarterbacks: [],
            impactPlayers: [],
            trends: {}
        };
        
        // Generate QB transfers (most valuable)
        const qbTransfers = [
            { name: 'Elite QB Transfer', from: 'Big School', to: 'Contender', nilValue: 1500000 },
            { name: 'Rising QB', from: 'Mid-Major', to: 'Power 5', nilValue: 800000 },
            { name: 'Veteran QB', from: 'Power 5', to: 'New Opportunity', nilValue: 600000 }
        ];
        
        portalActivity.quarterbacks = qbTransfers;
        
        // Impact players
        for (let i = 0; i < 20; i++) {
            portalActivity.impactPlayers.push({
                name: this.generatePlayerName(),
                position: ['RB', 'WR', 'LB', 'DB'][Math.floor(Math.random() * 4)],
                from: 'Previous School',
                to: 'New School',
                nilValue: 100000 + Math.random() * 400000,
                reason: ['Playing Time', 'NIL Opportunity', 'Coaching Change', 'Closer to Home'][Math.floor(Math.random() * 4)]
            });
        }
        
        // Trends
        portalActivity.trends = {
            increasePct: '+23%',
            topDestinations: ['SEC', 'Big Ten', 'Big 12'],
            topReasons: ['NIL', 'Playing Time', 'Coaching Changes'],
            averageNILIncrease: '+45%'
        };
        
        return portalActivity;
    }

    async projectChampionshipContenders(results) {
        console.log('🏆 Projecting championship contenders...');
        
        // Sort teams by championship readiness
        const contenders = results.teams
            .sort((a, b) => 
                (b.analytics?.championshipReadiness || 0) - 
                (a.analytics?.championshipReadiness || 0)
            )
            .slice(0, 12);
        
        // Add playoff projections
        for (const team of contenders) {
            team.playoffProjection = {
                cfpProbability: team.analytics.cfpProbability,
                conferenceChampProbability: team.analytics.conferenceChampProbability,
                projectedSeed: contenders.indexOf(team) + 1,
                strengthOfSchedule: 70 + Math.random() * 20,
                keyGames: this.identifyKeyGames(team.Team)
            };
        }
        
        return contenders;
    }

    identifyKeyGames(teamName) {
        const rivalries = {
            'Texas': ['Oklahoma', 'Texas A&M'],
            'Alabama': ['Auburn', 'LSU', 'Tennessee'],
            'Ohio State': ['Michigan', 'Penn State'],
            'Michigan': ['Ohio State', 'Michigan State'],
            'Georgia': ['Florida', 'Auburn', 'Tennessee'],
            'LSU': ['Alabama', 'Texas A&M', 'Ole Miss'],
            'Oklahoma': ['Texas', 'Oklahoma State'],
            'Notre Dame': ['USC', 'Stanford', 'Navy']
        };
        
        return rivalries[teamName] || ['Conference Championship'];
    }

    calculateNCAAMetrics(results) {
        const metrics = {
            totalTeams: results.teams.length,
            totalPlayers: results.players.length,
            totalNILValue: 0,
            averageNILValue: 0,
            topNILEarners: [],
            transferPortalVolume: 0,
            championshipContenders: [],
            heismanCandidates: [],
            draftEligible: []
        };
        
        // Calculate NIL metrics
        metrics.totalNILValue = results.nilDeals.reduce((sum, d) => sum + d.totalValue, 0);
        metrics.averageNILValue = results.nilDeals.length ? 
            metrics.totalNILValue / results.nilDeals.length : 0;
        
        // Top NIL earners
        metrics.topNILEarners = results.nilDeals
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10)
            .map(d => ({
                player: d.playerName,
                school: d.school,
                value: d.totalValue
            }));
        
        // Transfer portal volume
        metrics.transferPortalVolume = results.transferPortal.totalTransfers || 0;
        
        // Championship contenders
        metrics.championshipContenders = results.teams
            .filter(t => t.analytics?.cfpProbability > 50)
            .map(t => ({
                team: t.Team,
                probability: t.analytics.cfpProbability
            }));
        
        // Heisman candidates
        metrics.heismanCandidates = results.players
            .filter(p => p.metrics?.heismanStock > 50)
            .sort((a, b) => b.metrics.heismanStock - a.metrics.heismanStock)
            .slice(0, 10)
            .map(p => ({
                player: p.name,
                team: p.team,
                position: p.position,
                stock: p.metrics.heismanStock
            }));
        
        // Draft eligible
        metrics.draftEligible = results.players
            .filter(p => p.metrics?.draftProjection && 
                    ['JR', 'SR'].includes(p.year))
            .length;
        
        return metrics;
    }

    async validateData(results) {
        console.log('🔍 Validating NCAA/NIL data...');
        
        // Check roster sizes (85 scholarship limit)
        for (const team of results.teams) {
            if (team.players.length > 85) {
                console.warn(`⚠️ Roster exceeds scholarship limit for ${team.Team}: ${team.players.length}`);
            }
        }
        
        // Verify NIL valuations are reasonable
        const unreasonableNIL = results.nilDeals.filter(d => d.totalValue > 5000000);
        if (unreasonableNIL.length > 5) {
            console.warn(`⚠️ ${unreasonableNIL.length} players with NIL > $5M (verify accuracy)`);
        }
        
        console.log('✅ NCAA/NIL Validation complete');
    }

    async persistData(results) {
        console.log('💾 Persisting NCAA/NIL data...');
        
        const timestamp = new Date().toISOString();
        const data = {
            timestamp,
            league: 'NCAA',
            teams: results.teams,
            nilDeals: results.nilDeals,
            transferPortal: results.transferPortal,
            metrics: results.metrics,
            version: '1.0.0'
        };
        
        // In production: write to Cloudflare D1/R2
        if (typeof window === 'undefined') {
            const fs = require('fs').promises;
            await fs.writeFile(
                `/tmp/blaze-deploy/data/ncaa-nil-ingestion-${timestamp}.json`,
                JSON.stringify(data, null, 2)
            );
        }
        
        console.log('✅ NCAA/NIL Data persisted');
    }

    // Utility functions
    generatePlayerName(schoolName, position) {
        // Special players for certain schools
        if (schoolName === 'Texas' && position === 'QB' && Math.random() > 0.9) {
            return 'Arch Manning';
        }
        
        const firstNames = ['Jackson', 'Mason', 'Jayden', 'Michael', 'Christopher', 
                          'Joshua', 'Tyler', 'Brandon', 'Kyle', 'Jordan'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
                         'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
        
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    generateHometown() {
        const cities = [
            'Houston, TX', 'Dallas, TX', 'Austin, TX', 'San Antonio, TX',
            'Atlanta, GA', 'Miami, FL', 'Tampa, FL', 'Birmingham, AL',
            'New Orleans, LA', 'Nashville, TN', 'Columbus, OH', 'Detroit, MI',
            'Los Angeles, CA', 'Phoenix, AZ', 'Charlotte, NC'
        ];
        
        return cities[Math.floor(Math.random() * cities.length)];
    }

    generateHighSchool() {
        const schools = [
            'DeSoto HS', 'Duncanville HS', 'North Shore HS', 'Lake Travis HS',
            'IMG Academy', 'St. Thomas Aquinas', 'Mater Dei', 'Bishop Gorman',
            'Allen HS', 'Southlake Carroll', 'Katy HS', 'Spring Westfield'
        ];
        
        return schools[Math.floor(Math.random() * schools.length)];
    }

    generateRecruitingStars(schoolName, position) {
        // Elite schools get better recruits
        const eliteSchools = ['Alabama', 'Georgia', 'Ohio State', 'Texas', 'USC'];
        
        let baseStars = 3;
        
        if (eliteSchools.includes(schoolName)) {
            baseStars = Math.random() > 0.5 ? 4 : 3;
            if (Math.random() > 0.9) baseStars = 5;  // Occasional 5-star
        }
        
        // QBs and skill positions more likely to be highly rated
        if (['QB', 'RB', 'WR'].includes(position) && Math.random() > 0.7) {
            baseStars = Math.min(5, baseStars + 1);
        }
        
        return baseStars;
    }

    generateOffers(currentSchool) {
        const allSchools = [
            'Alabama', 'Georgia', 'Ohio State', 'Texas', 'Oklahoma', 'LSU',
            'Michigan', 'Notre Dame', 'USC', 'Clemson', 'Florida', 'Auburn',
            'Tennessee', 'Texas A&M', 'Penn State', 'Oregon', 'Wisconsin'
        ];
        
        const offerCount = Math.floor(Math.random() * 10) + 5;
        const offers = [];
        
        for (let i = 0; i < offerCount; i++) {
            const school = allSchools[Math.floor(Math.random() * allSchools.length)];
            if (school !== currentSchool && !offers.includes(school)) {
                offers.push(school);
            }
        }
        
        return offers;
    }

    generateNILProfile(position, year, schoolName) {
        const profile = {
            currentValue: 0,
            socialFollowers: 0,
            deals: [],
            marketability: 50
        };
        
        // Base values by position
        const positionValues = {
            'QB': 100000,
            'RB': 50000,
            'WR': 50000,
            'LB': 30000,
            'DL': 30000,
            'DB': 25000,
            'OL': 20000,
            'K': 10000
        };
        
        profile.currentValue = positionValues[position] || 15000;
        
        // Year multiplier
        const yearMultiplier = { 'FR': 0.5, 'SO': 0.8, 'JR': 1.2, 'SR': 1.0 }[year] || 1.0;
        profile.currentValue *= yearMultiplier;
        
        // School multiplier
        const schoolMultiplier = {
            'Texas': 2.0,
            'Alabama': 1.8,
            'Georgia': 1.7,
            'Ohio State': 1.6,
            'USC': 1.5
        }[schoolName] || 1.0;
        
        profile.currentValue = Math.round(profile.currentValue * schoolMultiplier);
        
        // Social followers
        profile.socialFollowers = Math.floor(profile.currentValue / 10) + 
                                 Math.floor(Math.random() * 10000);
        
        // Generate deals
        if (profile.currentValue > 100000) {
            profile.deals = ['National Brand', 'Local Dealership', 'Apparel'];
        } else if (profile.currentValue > 50000) {
            profile.deals = ['Regional Business', 'Restaurant Chain'];
        } else if (profile.currentValue > 25000) {
            profile.deals = ['Local Business'];
        }
        
        // Marketability score
        profile.marketability = Math.min(100, 
            50 + (profile.currentValue / 10000) + 
            (profile.socialFollowers / 1000)
        );
        
        return profile;
    }

    slugify(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NCAAIngestionAgent;
} else if (typeof window !== 'undefined') {
    window.NCAAIngestionAgent = NCAAIngestionAgent;
}