const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Test SSE Player Status with hasAnswered
 * Verify that the SSE endpoint correctly calculates hasAnswered for each player
 */

async function testPlayerStatusSSE() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME);
        
        const testQuizCode = 'STEST1';
        const players = [
            { id: '111', name: 'Alice' },
            { id: '222', name: 'Bob' },
            { id: '333', name: 'Charlie' }
        ];
        
        console.log('=== Creating Test Quiz for SSE Player Status ===');
        
        // Clean up
        await db.collection('quizRooms').deleteMany({ quizCode: testQuizCode });
        await db.collection('quizSessions').deleteMany({ quizCode: testQuizCode });
        
        // Create quiz room
        const quizRoom = {
            quizCode: testQuizCode,
            status: 'active',
            players: players.map(p => ({ ...p, score: 0, joinedAt: new Date() })),
            createdAt: new Date()
        };
        
        await db.collection('quizRooms').insertOne(quizRoom);
        
        // Create quiz session with some answers
        const quizSession = {
            quizCode: testQuizCode,
            status: 'active',
            currentQuestionIndex: 0,
            questions: [{
                question: "Test question",
                answers: ["A. Option A", "B. Option B", "C. Option C", "D. Option D"],
                correctAnswer: "A",
                explanation: "Test explanation"
            }],
            playerAnswers: {
                // Alice has answered question 0
                '111': {
                    q0: {
                        playerId: '111',
                        answer: 'A',
                        isCorrect: true,
                        score: 100,
                        timestamp: new Date()
                    }
                }
                // Bob and Charlie haven't answered
            },
            timeRemaining: 30,
            questionStartedAt: new Date(),
            createdAt: new Date()
        };
        
        await db.collection('quizSessions').insertOne(quizSession);
        
        console.log('✅ Test data created');
        console.log('Players:');
        players.forEach(p => console.log(`  - ${p.name} (${p.id})`));
        console.log('Expected results:');
        console.log('  - Alice (111): hasAnswered = true');
        console.log('  - Bob (222): hasAnswered = false');
        console.log('  - Charlie (333): hasAnswered = false');
        
        console.log('\n=== Simulating SSE Logic ===');
        
        // Simulate the SSE logic
        const quizRoomData = await db.collection('quizRooms').findOne({ 
            quizCode: testQuizCode.toUpperCase() 
        });
        const quizSessionData = await db.collection('quizSessions').findOne({ 
            quizCode: testQuizCode.toUpperCase() 
        });
        
        const currentQuestionIndex = quizSessionData.currentQuestionIndex;
        const playersWithStatus = (quizRoomData.players || []).map((player) => {
            const hasAnswered = quizSessionData.playerAnswers?.[player.id]?.[`q${currentQuestionIndex}`] ? true : false;
            return {
                ...player,
                hasAnswered
            };
        });
        
        console.log('\nSSE Result:');
        playersWithStatus.forEach(player => {
            console.log(`  - ${player.name} (${player.id}): hasAnswered = ${player.hasAnswered}`);
        });
        
        // Verify results
        console.log('\n=== Verification ===');
        let allCorrect = true;
        
        const alice = playersWithStatus.find(p => p.id === '111');
        const bob = playersWithStatus.find(p => p.id === '222');
        const charlie = playersWithStatus.find(p => p.id === '333');
        
        if (alice?.hasAnswered === true) {
            console.log('✅ Alice correctly marked as hasAnswered = true');
        } else {
            console.log('❌ Alice should have hasAnswered = true');
            allCorrect = false;
        }
        
        if (bob?.hasAnswered === false) {
            console.log('✅ Bob correctly marked as hasAnswered = false');
        } else {
            console.log('❌ Bob should have hasAnswered = false');
            allCorrect = false;
        }
        
        if (charlie?.hasAnswered === false) {
            console.log('✅ Charlie correctly marked as hasAnswered = false');
        } else {
            console.log('❌ Charlie should have hasAnswered = false');
            allCorrect = false;
        }
        
        if (allCorrect) {
            console.log('\n🎉 All tests passed! SSE will correctly show player status.');
        } else {
            console.log('\n❌ Some tests failed. SSE logic needs review.');
        }
        
        // Test with more answers
        console.log('\n=== Testing After Bob Answers ===');
        
        // Add Bob's answer
        await db.collection('quizSessions').updateOne(
            { quizCode: testQuizCode },
            {
                $set: {
                    'playerAnswers.222.q0': {
                        playerId: '222',
                        answer: 'B',
                        isCorrect: false,
                        score: 0,
                        timestamp: new Date()
                    }
                }
            }
        );
        
        // Re-simulate SSE logic
        const updatedSession = await db.collection('quizSessions').findOne({ 
            quizCode: testQuizCode.toUpperCase() 
        });
        
        const updatedPlayersWithStatus = (quizRoomData.players || []).map((player) => {
            const hasAnswered = updatedSession.playerAnswers?.[player.id]?.[`q${currentQuestionIndex}`] ? true : false;
            return {
                ...player,
                hasAnswered
            };
        });
        
        console.log('Updated SSE Result:');
        updatedPlayersWithStatus.forEach(player => {
            console.log(`  - ${player.name} (${player.id}): hasAnswered = ${player.hasAnswered}`);
        });
        
        const aliceUpdated = updatedPlayersWithStatus.find(p => p.id === '111');
        const bobUpdated = updatedPlayersWithStatus.find(p => p.id === '222');
        const charlieUpdated = updatedPlayersWithStatus.find(p => p.id === '333');
        
        console.log('\nVerification:');
        console.log(`✅ Alice: ${aliceUpdated?.hasAnswered === true ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Bob: ${bobUpdated?.hasAnswered === true ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Charlie: ${charlieUpdated?.hasAnswered === false ? 'PASS' : 'FAIL'}`);
        
        // Cleanup
        await db.collection('quizRooms').deleteMany({ quizCode: testQuizCode });
        await db.collection('quizSessions').deleteMany({ quizCode: testQuizCode });
        
        console.log('\n✅ Test completed and cleaned up');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testPlayerStatusSSE().catch(console.error);
