#!/usr/bin/env node

/**
 * Cleanup script to remove duplicate timer_update events from quizEvents collection
 * This fixes the multiple records issue caused by the previous timer update implementation
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('🧹 ========== QUIZ EVENTS CLEANUP SCRIPT ==========');
console.log('🎯 Purpose: Remove duplicate timer_update events');
console.log('🔧 Target: quizEvents collection');
console.log('💡 Strategy: Keep only the latest event per quiz code');

async function cleanupQuizEvents() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB');

    // First, let's see what we have
    console.log('\n📊 Current state analysis...');
    const totalEvents = await db.collection('quizEvents').countDocuments();
    console.log(`📋 Total events in collection: ${totalEvents}`);

    // Count events by type
    const eventsByType = await db.collection('quizEvents').aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('📊 Events by type:');
    eventsByType.forEach(type => {
      console.log(`   ${type._id}: ${type.count} events`);
    });

    // Find duplicate timer_update events
    console.log('\n🔍 Finding duplicate timer_update events...');
    const timerUpdates = await db.collection('quizEvents').find({
      type: 'timer_update'
    }).toArray();

    console.log(`⚠️ Found ${timerUpdates.length} timer_update events (should be 0 or match active quiz count)`);

    if (timerUpdates.length > 0) {
      console.log('\n🗑️ Removing timer_update events...');
      const deleteResult = await db.collection('quizEvents').deleteMany({
        type: 'timer_update'
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} timer_update events`);
    }

    // Find quiz codes with multiple events
    console.log('\n🔍 Finding quiz codes with multiple events...');
    const duplicateQuizCodes = await db.collection('quizEvents').aggregate([
      { $group: { _id: '$quizCode', count: { $sum: 1 }, events: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    console.log(`🔍 Found ${duplicateQuizCodes.length} quiz codes with multiple events:`);
    
    for (const quizGroup of duplicateQuizCodes) {
      console.log(`\n📋 Quiz Code: ${quizGroup._id} (${quizGroup.count} events)`);
      
      // Sort events by lastUpdated (newest first)
      const sortedEvents = quizGroup.events.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      console.log('   Events (newest first):');
      sortedEvents.forEach((event, index) => {
        console.log(`     ${index + 1}. ${event.type} - ${event.lastUpdated} ${index === 0 ? '(KEEP)' : '(DELETE)'}`);
      });

      // Keep the newest event, delete the rest
      const eventsToDelete = sortedEvents.slice(1); // All except the first (newest)
      
      if (eventsToDelete.length > 0) {
        console.log(`   🗑️ Deleting ${eventsToDelete.length} older events...`);
        
        for (const eventToDelete of eventsToDelete) {
          await db.collection('quizEvents').deleteOne({ _id: eventToDelete._id });
          console.log(`     ✅ Deleted: ${eventToDelete.type} from ${eventToDelete.lastUpdated}`);
        }
      }
    }

    // Final state analysis
    console.log('\n📊 Final state analysis...');
    const finalTotal = await db.collection('quizEvents').countDocuments();
    console.log(`📋 Total events after cleanup: ${finalTotal}`);

    const finalEventsByType = await db.collection('quizEvents').aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('📊 Final events by type:');
    finalEventsByType.forEach(type => {
      console.log(`   ${type._id}: ${type.count} events`);
    });

    // Verify one event per quiz code
    const finalDuplicates = await db.collection('quizEvents').aggregate([
      { $group: { _id: '$quizCode', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (finalDuplicates.length === 0) {
      console.log('✅ SUCCESS: Each quiz code now has exactly one event!');
    } else {
      console.log(`⚠️ WARNING: ${finalDuplicates.length} quiz codes still have multiple events`);
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('💡 The quizEvents collection now follows the one-record-per-quiz-code pattern');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the cleanup
cleanupQuizEvents().catch(console.error);
