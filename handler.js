import _ from 'lodash'
import axios from 'axios'
import { Pool } from 'pg'

const isDev = process.env.NODE_ENV !== 'production'
const isTest = true

const authUrl = isDev ? 'https://localhost:4000/auth' : isTest ? 'https://api-testnet.stellarauth.com/auth' : 'https://api.stellarauth.com/auth'

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10,
  ssl: true,
  max: 1000
})

const headers = {
  'Access-Control-Allow-Origin': '*'
}

const get = (event, context) => {
  return getUser(
    _.get(event, 'queryStringParameters.auth')
  )
}

const post = (event, context) => {
  return postUser(JSON.parse(event.body))
}

const put = (event, context) => {
  return putUser(JSON.parse(event.body))
}

async function getUser(auth) {
  try {
    const transaction = await axios.get(authUrl, {
      headers: {
        Authorization: `Bearer ${auth}`
      }
    }).then(({data}) => data)

    const result = await pool.query(`
      select * from users 
      where id='${transaction.source_account}'
    `)

    if (_.get(result, 'rows[0]'))
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      }

    else
      throw 'User not found'
  } 
  
  catch(err) {
    return parseError(err)
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
    return parseError(err)
  }
}

async function putUser(data) {
  try {
    const transaction = await axios.get(authUrl, {
      headers: {
        Authorization: `Bearer ${data.auth}`
      }
    }).then(({data}) => data)

    let query = 'update users set '

    _.each(data, (value, key) => {
      if (
        typeof value === 'string'
        && ['email', 'fname', 'lname', 'note'].indexOf(key) !== -1
      ) query += `${key}='${value}',`
    })

    query = query.substring(0, query.length - 1)
    query += ` where id='${transaction.source_account}'`

    if (query.indexOf('set where') !== -1)
      throw 'Nothing to update'

    const result = await pool.query(query)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } 

  catch(err) {
    return parseError(err)
  }
}

function parseError(err) {
  const error = 
  typeof err === 'string' 
  ? { message: err } 
  : err.response && err.response.data 
  ? err.response.data 
  : err.response 
  ? err.response
  : err.message 
  ? { message: err.message }
  : err

  console.error(error)
  // console.error(err)

  return {
    statusCode: error.status || err.status || 400,
    headers,
    body: JSON.stringify(error)
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