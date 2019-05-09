import _ from 'lodash'
import { Pool } from 'pg'

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
})

const headers = {
  'Access-Control-Allow-Origin': '*'
}

const get = (event, context) => {
  const q_id = _.get(event, 'queryStringParameters.id')
  return getUser(q_id)
}

const post = (event, context) => {
  return postUser(JSON.parse(event.body))
}

const put = (event, context) => {
  return putUser(JSON.parse(event.body))
}

async function getUser(id) {
  try {
    const result = await pool.query(`
      select * from users 
      where id='${id}'
    `)

    if (result.rows[0])
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      }

    else
      throw {message: 'User not found'}
  } 
  
  catch(err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(err)
    }
  }
}

async function postUser(data) {
  try {
    const result = await pool.query(`
      insert into users (id)
      values ('${data.id}')
    `)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } 
  
  catch(err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(err)
    }
  }
}

async function putUser(data) {
  try {
    let query = 'update users set '

    _.each(data, (value, key) => {
      if (
        key !== 'id'
        && ['email', 'fname', 'lname', 'note'].indexOf(key) !== -1
      ) query += `${key}='${value}',`
    })

    query = query.substring(0, query.length - 1)
    query += ` where id='${data.id}'`

    const result = await pool.query(query)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } 

  catch(err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(err)
    }
  }
}

export const users = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  switch (event.httpMethod) {
    case 'GET':
    return get(event, context)

    case 'POST':
    return post(event, context)
    
    case 'PUT':
    return put(event, context)

    default:
      callback(null, {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Method not supported' })
      })
    break
  }
}