import Event from '../../models/Event';
import EventModel from '../../models/Event';
import { MongoMemoryServer } from 'mongodb-memory-server';
import client from '../../../../client';
import { dedent } from '../../../../utils';
import listEvents from '../listEvents';
import mongoose from 'mongoose';
import { strings } from '../../constants';
import 'babel-polyfill';

describe('listing Events', () => {
  let uri;

  beforeAll(async () => {
    client.message = {
      channel: {
        send: jest.fn()
      },
      content: '++ama list'
    };

    client.prefix = '++';

    const mongod = new MongoMemoryServer();
    uri = await mongod.getUri();
  });

  beforeEach(async () => {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await EventModel.deleteMany({});
  });

  test('ama lists all events', async () => {
    await Event({
      date: new Date('2015-05-01T12:00:00Z'),
      title: 'Old 1'
    }).save();

    await Event({
      date: new Date('2015-03-01T12:00:00Z'),
      title: 'Old 2'
    }).save();

    await Event({
      date: new Date('2125-05-01T12:00:00Z'),
      title: 'New 1'
    }).save();

    await Event({
      date: new Date('2128-03-15T12:00:00Z'),
      title: 'New 2'
    }).save();

    await Event({
      date: new Date('2128-04-20T12:00:00Z'),
      title: 'New 3'
    }).save();

    await listEvents.handler([]);

    const expectedEventList = dedent(
      `__**Past Events**__
      Sun Mar 01 2015: Old 2
      Fri May 01 2015: Old 1

      __**Upcoming Event**__
      Tue May 01 2125: New 1

      __**Future Events**__
      Mon Mar 15 2128: New 2
      Tue Apr 20 2128: New 3\n
      `
    );

    expect(client.message.channel.send).toHaveBeenCalledWith(expectedEventList);
  });

  test('ama sends message when no events available', async () => {
    await listEvents.handler([]);
    expect(client.message.channel.send).toHaveBeenCalledWith(strings.noEvents);
  });

  test('ama sends message with ID when requested with flag', async () => {
    let event = await Event({
      date: new Date('2015-05-01T12:00:00Z'),
      title: 'Old 1'
    }).save();

    client.message.content = '++ama list -i';

    await listEvents.handler([]);

    const expectedEventList = `__**Past Events**__
${event.id} Fri May 01 2015: Old 1\n
`;

    expect(client.message.channel.send).toHaveBeenCalledWith(expectedEventList);
  });

  test('ama sends message when only upcoming event', async () => {
    await Event({
      date: new Date('2115-05-01T12:00:00Z'),
      title: 'New 1'
    }).save();

    client.message.content = '++ama list';

    await listEvents.handler([]);

    const expectedEventList = `__**Upcoming Event**__
Wed May 01 2115: New 1\n
`;

    expect(client.message.channel.send).toHaveBeenCalledWith(expectedEventList);
  });
});
